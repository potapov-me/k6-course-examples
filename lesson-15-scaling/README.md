# Урок 15: Масштабирование генераторов нагрузки и k6 в Kubernetes

Distributed execution, k6-operator, и автоматическое масштабирование.

## Установка k6-operator

```bash
# Установка через Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
helm install k6-operator grafana/k6-operator

# Проверка
kubectl get pods -n k6-operator-system
```

## Примеры

### 1. k6-operator TestRun (`k6-operator.yaml`)

Простой способ запуска k6 в Kubernetes:

```bash
# Применить ConfigMap с тестом
kubectl apply -f k6-operator.yaml

# Запустить smoke test
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: my-smoke-test
spec:
  parallelism: 1
  script:
    configMap:
      name: k6-test-smoke
      file: smoke.js
EOF

# Проверка статуса
kubectl get testruns
kubectl describe testrun my-smoke-test

# Логи
kubectl logs -l k6_cr=my-smoke-test
```

**Результат:**
```
NAME            STAGE      AGE
my-smoke-test   finished   2m
```

### 2. Distributed execution (`distributed.yaml`)

Запуск с несколькими параллельными генераторами:

```bash
# Distributed TestRun (5 pods)
kubectl apply -f - <<EOF
apiVersion: k6.io/v1alpha1
kind: TestRun
metadata:
  name: distributed-load-test
spec:
  parallelism: 5  # 5 параллельных генераторов
  script:
    configMap:
      name: k6-test-load
  arguments: --vus 100 --duration 10m
  runner:
    resources:
      requests:
        cpu: "1"
        memory: "512Mi"
EOF

# Мониторинг всех pods
kubectl get pods -l k6_cr=distributed-load-test -w

# Агрегированные логи
kubectl logs -l k6_cr=distributed-load-test --tail=100
```

**Результат:**
- 5 pods генерируют нагрузку одновременно
- Каждый pod: 100 VUs × 10 минут
- Total: 500 VUs distributed

### 3. Job для одноразовых тестов

```bash
# Запустить stress test Job
kubectl apply -f distributed.yaml

# Проверка Job
kubectl get jobs k6-stress-test

# Логи
kubectl logs job/k6-stress-test
```

### 4. CronJob для регулярных тестов

```bash
# Nightly test каждую ночь в 2:00
kubectl apply -f distributed.yaml

# Проверка расписания
kubectl get cronjobs

# Ручной запуск
kubectl create job --from=cronjob/k6-nightly-test manual-run-1
```

## Scaling Strategies

### Strategy 1: Vertical (больше ресурсов на pod)

```yaml
resources:
  requests:
    cpu: "4"      # Было: 1
    memory: "2Gi" # Было: 512Mi
  limits:
    cpu: "8"
    memory: "4Gi"
```

**Когда использовать:**
- Один генератор может справиться
- Нужна высокая производительность на pod

### Strategy 2: Horizontal (больше pods)

```yaml
spec:
  parallelism: 20  # Было: 5
```

**Когда использовать:**
- Нужно > 1000 VUs
- Один pod упирается в CPU/RAM

### Strategy 3: Auto-scaling (HPA)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
spec:
  minReplicas: 1
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          averageUtilization: 70
```

**Когда использовать:**
- Переменная нагрузка
- Cost optimization

## Best Practices

### 1. Resource Requests/Limits

```yaml
# ✅ Хорошо: определены requests и limits
resources:
  requests:
    cpu: "1"
    memory: "512Mi"
  limits:
    cpu: "2"      # 2x requests
    memory: "1Gi" # 2x requests
```

**Рекомендации:**
- Requests: минимум для работы
- Limits: 2x requests (буфер для bursts)
- Мониторьте actual usage

### 2. Parallelism vs VUs

```yaml
# 1000 VUs = 10 pods × 100 VUs
parallelism: 10
arguments: --vus 100
```

**Формула:**
```
Total VUs = parallelism × VUs_per_pod
```

### 3. Results Collection

```yaml
# Prometheus (recommended)
env:
  - name: K6_PROMETHEUS_RW_SERVER_URL
    value: "http://prometheus:9090/api/v1/write"

# JSON (для CI/CD)
arguments: --summary-export=/results/summary.json

# Cloud (для больших тестов)
env:
  - name: K6_CLOUD_TOKEN
    valueFrom:
      secretKeyRef:
        name: k6-cloud
        key: token
```

### 4. Network Performance

```yaml
# Используйте affinity для распределения
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: k6-generator
          topologyKey: kubernetes.io/hostname
```

**Зачем:**
- Распределить генераторы по разным нодам
- Избежать network bottleneck на одной ноде

## Troubleshooting

### Pods падают (OOMKilled)

```bash
# Проверка ресурсов
kubectl describe pod k6-xxx | grep -A5 "Limits\|Requests"

# Решение: увеличьте memory
resources:
  limits:
    memory: "2Gi"  # Было: 1Gi
```

### Низкий RPS (dropped_iterations)

```bash
# Логи pod
kubectl logs k6-xxx | grep dropped_iterations

# Решение: увеличьте CPU или parallelism
```

### TestRun не стартует

```bash
# Проверка CRD
kubectl get crd testruns.k6.io

# Проверка оператора
kubectl get pods -n k6-operator-system

# Логи оператора
kubectl logs -n k6-operator-system deployment/k6-operator-controller-manager
```

### Results не собираются

```bash
# Проверка Prometheus
kubectl port-forward svc/prometheus 9090:9090
open http://localhost:9090

# Проверка метрик k6
curl http://localhost:9090/api/v1/query?query=k6_http_reqs
```

## Monitoring

### Grafana Dashboard для k6

```bash
# Import dashboard 2587 (k6 Load Testing Results)
kubectl port-forward svc/grafana 3000:80
open http://localhost:3000
# Dashboards → Import → 2587
```

### Prometheus Queries

```promql
# RPS
rate(k6_http_reqs[1m])

# P95 latency
histogram_quantile(0.95, k6_http_req_duration_bucket)

# Error rate
rate(k6_http_req_failed[1m])

# Active VUs
k6_vus

# Data sent/received
rate(k6_data_sent[1m])
rate(k6_data_received[1m])
```

## Cost Optimization

### Spot Instances

```yaml
# Node affinity для spot instances
affinity:
  nodeAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions:
            - key: node.kubernetes.io/instance-type
              operator: In
              values:
                - spot
```

### Preemptible Pods

```yaml
spec:
  template:
    spec:
      priorityClassName: low-priority
      tolerations:
        - key: "spot"
          operator: "Exists"
```

## Полезные ссылки

- [k6-operator Docs](https://github.com/grafana/k6-operator)
- [k6 Kubernetes Guide](https://k6.io/docs/testing-guides/running-distributed-tests/)
- [Prometheus Remote Write](https://k6.io/docs/results-output/real-time/prometheus-remote-write/)
