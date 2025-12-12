# Урок 13: Chaos Engineering под нагрузкой

Интеграция k6 с Chaos Engineering инструментами для тестирования отказоустойчивости.

## Примеры

### 1. Toxiproxy (локальный chaos) (`toxiproxy-example.js`)

Chaos Engineering на локальной машине без Kubernetes:

```bash
# Установите Toxiproxy
brew install toxiproxy

# Запустите server
toxiproxy-server &

# Создайте прокси для вашего API
toxiproxy-cli create shopstack-api -l localhost:28080 -u localhost:3000

# Обновите BASE_URL
export BASE_URL=http://localhost:28080

# Запустите тест
k6 run toxiproxy-example.js
```

**Что тестируется:**
- Network latency (1s задержка + jitter)
- Packet loss (10% пакетов)
- Восстановление после chaos

**Результаты:**
```
✓ status is 200 (baseline)
✓ response despite latency (chaos)
✓ handled packet loss (chaos)
✓ status is 200 (recovery)

chaos_injected................: 2    (latency, packet_loss)
resilience_rate...............: 92%  (90%+ required)
```

### 2. Chaos Mesh (Kubernetes chaos) (`chaos-mesh.yaml`)

Production-like chaos в Kubernetes:

```bash
# Установите Chaos Mesh
kubectl apply -f https://mirrors.chaos-mesh.org/v2.6.0/crd.yaml
kubectl apply -f https://mirrors.chaos-mesh.org/v2.6.0/chaos-mesh.yaml

# Примените chaos experiments
kubectl apply -f chaos-mesh.yaml

# Запустите k6 тест
k6 run --vus 50 --duration 10m ../lesson-06-executors/ramping-vus.js

# Мониторинг chaos
kubectl get networkchaos
kubectl get podchaos
kubectl get stresschaos
```

**Типы chaos:**

| Тип | Описание | Duration |
|-----|----------|----------|
| Network latency | 500ms + 200ms jitter | 5m |
| Packet loss | 10% потеря пакетов | 3m |
| Pod kill | Убийство pod'ов | 30s |
| Pod failure | Сбой контейнера | 2m |
| CPU stress | 80% CPU нагрузка | 5m |
| Memory stress | 512MB memory | 3m |
| HTTP abort | Возврат ошибок | 2m |

### 3. Resilience тест (`resilience-test.js`)

Тестирование паттернов отказоустойчивости:

```bash
# Запустите тест
k6 run resilience-test.js

# В другом терминале симулируйте сбой
docker-compose stop api
sleep 30
docker-compose start api
```

**Паттерны resilience:**

1. **Retry с exponential backoff**
   ```javascript
   function retryRequest(url, maxRetries = 3) {
     let backoff = 100;
     for (let i = 0; i < maxRetries; i++) {
       const res = http.get(url);
       if (res.status === 200) return res;
       sleep(backoff / 1000);
       backoff *= 2; // 100ms, 200ms, 400ms
     }
   }
   ```

2. **Circuit Breaker**
   ```javascript
   class CircuitBreaker {
     // CLOSED → запросы проходят
     // OPEN → запросы блокируются
     // HALF_OPEN → пробуем восстановиться
   }
   ```

3. **Fallback**
   ```javascript
   if (!res || res.status !== 200) {
     products = FALLBACK_PRODUCTS; // Кешированные данные
   }
   ```

**Метрики:**
- `retry_attempts` — количество retry попыток
- `success_after_retry` — успешные retry
- `circuit_breaker_opened` — сколько раз открылся CB
- `fallback_used` — использование fallback данных
- `resilience_score` — процент resilient запросов
- `recovery_time` — время восстановления

## Сценарии chaos тестирования

### Black Friday Simulation

```yaml
# chaos-mesh.yaml (workflow)
apiVersion: chaos-mesh.org/v1alpha1
kind: Workflow
metadata:
  name: black-friday-chaos
spec:
  entry: the-entry
  templates:
    - baseline (5m)           # Нормальная нагрузка
    - network-latency (5m)    # Деградация сети
    - pod-failures (3m)       # Убийство pods
    - stress-test (5m)        # CPU/Memory stress
    - recovery (5m)           # Восстановление
```

**Запуск:**
```bash
kubectl apply -f chaos-mesh.yaml
kubectl get workflow black-friday-chaos -w
```

## Best Practices

### 1. Начните с малого

**❌ Плохо:**
```yaml
# Сразу убиваем 100% pods
podChaos:
  mode: all
  value: "100"
```

**✅ Хорошо:**
```yaml
# Начните с 10%, постепенно увеличивайте
podChaos:
  mode: fixed-percent
  value: "10"
```

### 2. Мониторинг обязателен

Всегда мониторьте систему во время chaos:
- Prometheus метрики
- Grafana дашборды
- Application logs
- k6 результаты

### 3. Используйте production-like окружение

**❌ Плохо:** Chaos на production без подготовки

**✅ Хорошо:**
- Staging с production-like данными
- Pre-production окружение
- Feature flags для изоляции
- Постепенное внедрение (canary)

### 4. Определите blast radius

```yaml
# Ограничьте зону поражения
selector:
  namespaces: ["staging"]  # Только staging
  labelSelectors:
    tier: backend           # Только backend
    version: canary         # Только canary release
```

### 5. Автоматизируйте recovery

```javascript
export function teardown() {
  // Всегда удаляйте toxics после теста
  removeToxic('shopstack-api', 'latency_toxic');
  removeToxic('shopstack-api', 'packet_loss_toxic');
}
```

## Troubleshooting

### Toxiproxy не запускается

```bash
# Проверка
ps aux | grep toxiproxy

# Логи
toxiproxy-server -config toxiproxy.json

# Альтернатива: Docker
docker run --rm -p 8474:8474 -p 28080:28080 shopify/toxiproxy
```

### Chaos Mesh не применяется

```bash
# Проверка CRDs
kubectl get crd | grep chaos

# Проверка pods
kubectl get pods -n chaos-mesh

# Логи chaos controller
kubectl logs -n chaos-mesh chaos-controller-manager-xxx
```

### Circuit Breaker не работает

Проверьте threshold и timeout:
```javascript
const cb = new CircuitBreaker(
  5,      // Threshold: 5 failures
  10000   // Timeout: 10s
);

// Убедитесь, что failureCount инкрементируется
console.log('Failure count:', cb.failureCount);
```

## Полезные ссылки

- [Toxiproxy Docs](https://github.com/Shopify/toxiproxy)
- [Chaos Mesh Docs](https://chaos-mesh.org/docs/)
- [Chaos Engineering Principles](https://principlesofchaos.org/)
- [k6 + Chaos Guide](https://k6.io/blog/chaos-engineering/)
