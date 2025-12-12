# k6 Course Examples

Примеры кода для курса **"k6: нагрузочное тестирование как система"**

🔗 **Курс:** https://potapov.me/education/courses/k6-load-testing

## 🚀 Быстрый старт

### 1. Установите k6

**macOS:**
```bash
brew install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

### 2. Запустите ShopStack приложение

```bash
cd shopstack-app
docker-compose up -d
```

### 3. Запустите первый тест

```bash
# Простой smoke-тест
k6 run lesson-05-first-smoke/smoke.js

# Результаты
# ✓ status is 200
# ✓ response time < 500ms
# http_req_duration..............: avg=234ms p(95)=456ms
# http_req_failed................: 0.00%
```

## 📂 Структура репозитория

```
k6-course-examples/
├── shopstack-app/              # Демо-приложение для всех уроков
│   ├── docker-compose.yml      # Запуск одной командой
│   ├── services/               # API, Auth, Payment, Inventory
│   ├── db/init.sql             # Database schema + test data
│   ├── prometheus/             # Monitoring config
│   └── grafana/                # Dashboards
│
├── lesson-05-first-smoke/      # Урок 05: Первый smoke-тест
│   ├── smoke.js
│   ├── with-checks.js
│   └── README.md
│
├── lesson-06-executors/        # Урок 06: Executors и scenarios
│   ├── constant-vus.js
│   ├── ramping-vus.js
│   ├── constant-arrival-rate.js
│   └── README.md
│
├── lesson-07-traffic-modeling/ # Урок 07: Моделирование трафика
│   ├── user-journeys.js
│   ├── realistic-mix.js
│   └── README.md
│
├── lesson-08-advanced-js/      # Урок 08: Продвинутый JavaScript
│   ├── modular/
│   ├── shared-data.js
│   └── README.md
│
├── lesson-09-metrics/          # Урок 09: Метрики и thresholds
│   ├── basic-thresholds.js
│   ├── advanced-thresholds.js
│   └── README.md
│
├── lesson-10-custom-metrics/   # Урок 10: Custom метрики
│   ├── custom-metrics.js
│   ├── business-kpi.js
│   └── README.md
│
├── lesson-11-observability/    # Урок 11: Observability
│   ├── prometheus.js
│   ├── traceparent.js
│   └── README.md
│
├── lesson-12-ci-cd/            # Урок 12: CI/CD интеграция
│   ├── .github/workflows/
│   ├── .gitlab-ci.yml
│   ├── compare-baseline.js
│   └── README.md
│
├── lesson-13-chaos/            # Урок 13: Chaos Engineering
│   ├── toxiproxy-example.js
│   ├── chaos-mesh.yaml
│   └── README.md
│
├── lesson-14-protocols/        # Урок 14: WebSocket & gRPC
│   ├── websocket.js
│   ├── grpc.js
│   └── README.md
│
├── lesson-15-scaling/          # Урок 15: Масштабирование
│   ├── k6-operator.yaml
│   ├── distributed.yaml
│   └── README.md
│
├── lesson-16-patterns/         # Урок 16: Продвинутые паттерны
│   ├── cleanup.js
│   ├── canary.js
│   └── README.md
│
├── lesson-17-final/            # Урок 17: Финальный проект
│   ├── black-friday-stress.js
│   ├── full-pipeline.js
│   └── README.md
│
├── fixtures/                   # Тестовые данные
│   ├── users.json              # 10k пользователей
│   ├── products.json           # 1k товаров
│   └── generate-data.js        # Генератор данных
│
├── lib/                        # Переиспользуемые утилиты
│   ├── auth.js                 # Авторизация
│   ├── helpers.js              # Вспомогательные функции
│   └── http-client.js          # HTTP wrapper
│
└── scripts/                    # Вспомогательные скрипты
    ├── setup.sh                # Автоматическая установка
    └── cleanup.sh              # Очистка тестовых данных
```

## 📚 Примеры по урокам

### Урок 05: Первый smoke-тест

**Что покрывает:** Установка k6, базовые опции, первый smoke

```bash
cd lesson-05-first-smoke
k6 run smoke.js
```

**Примеры:**
- `smoke.js` — базовый smoke-тест
- `with-checks.js` — smoke с проверками ответов
- `with-thresholds.js` — smoke с thresholds

### Урок 06: Executors и scenarios

**Что покрывает:** Управление нагрузкой, executors, scenarios

```bash
cd lesson-06-executors
k6 run constant-vus.js          # Фиксированное кол-во VU
k6 run ramping-vus.js           # Плавное нарастание
k6 run constant-arrival-rate.js # Фиксированный RPS
```

**Примеры:**
- `constant-vus.js` — постоянное количество VU
- `ramping-vus.js` — load-тест с ramping
- `constant-arrival-rate.js` — фиксированный RPS
- `multiple-scenarios.js` — несколько scenarios

### Урок 07: Моделирование трафика

**Что покрывает:** Реалистичные user journeys, traffic mix

```bash
cd lesson-07-traffic-modeling
k6 run user-journeys.js   # Reader/Buyer/Admin flows
k6 run realistic-mix.js   # Production-like traffic
```

**Примеры:**
- `user-journeys.js` — reader/buyer/admin потоки
- `realistic-mix.js` — реалистичный микс трафика
- `think-time.js` — паузы между действиями

### Урок 08: Продвинутый JavaScript

**Что покрывает:** Модульность, SharedArray, отладка

```bash
cd lesson-08-advanced-js
k6 run modular/main.js    # Модульная структура
k6 run shared-data.js     # SharedArray для данных
```

**Примеры:**
- `modular/` — модульная архитектура тестов
- `shared-data.js` — работа с SharedArray
- `debugging.js` — отладка тестов

### Урок 09: Метрики и thresholds

**Что покрывает:** Базовые метрики, thresholds, SLO

```bash
cd lesson-09-metrics
k6 run basic-thresholds.js      # Простые thresholds
k6 run advanced-thresholds.js   # Продвинутые thresholds
```

**Примеры:**
- `basic-thresholds.js` — базовые thresholds
- `advanced-thresholds.js` — продвинутые thresholds
- `slo-based.js` — thresholds на основе SLO

### Урок 10: Custom метрики

**Что покрывает:** Trend, Counter, Gauge, Rate, бизнес-KPI

```bash
cd lesson-10-custom-metrics
k6 run custom-metrics.js  # Custom метрики
k6 run business-kpi.js    # Бизнес-метрики
```

**Примеры:**
- `custom-metrics.js` — Trend, Counter, Gauge, Rate
- `business-kpi.js` — бизнес-метрики (conversion, cart abandonment)

### Урок 11: Observability

**Что покрывает:** Grafana, Prometheus, трейсы, триангуляция

```bash
cd lesson-11-observability
k6 run prometheus.js      # Экспорт в Prometheus
k6 run traceparent.js     # Корреляция трейсов
```

**Примеры:**
- `prometheus.js` — интеграция с Prometheus
- `traceparent.js` — W3C Trace Context
- `grafana-live.js` — k6 Cloud real-time

### Урок 12: CI/CD

**Что покрывает:** GitHub Actions, GitLab CI, baseline сравнение

```bash
cd lesson-12-ci-cd
# См. .github/workflows/ и .gitlab-ci.yml
```

**Примеры:**
- `.github/workflows/k6.yml` — GitHub Actions
- `.gitlab-ci.yml` — GitLab CI
- `compare-baseline.js` — сравнение с baseline
- `jenkins.groovy` — Jenkins pipeline

### Урок 13: Chaos Engineering

**Что покрывает:** Toxiproxy, Chaos Mesh, resilience тестирование

```bash
cd lesson-13-chaos
k6 run toxiproxy-example.js     # Locальный chaos
kubectl apply -f chaos-mesh.yaml # Kubernetes chaos
```

**Примеры:**
- `toxiproxy-example.js` — network latency/packet loss
- `chaos-mesh.yaml` — Kubernetes chaos
- `resilience-test.js` — тестирование отказоустойчивости

### Урок 14: WebSocket & gRPC

**Что покрывает:** WebSocket тесты, gRPC, xk6 расширения

```bash
cd lesson-14-protocols
k6 run websocket.js       # WebSocket тест
k6 run grpc.js            # gRPC тест
```

**Примеры:**
- `websocket.js` — WebSocket connection + messages
- `grpc.js` — gRPC unary calls
- `grpc-streaming.js` — gRPC streaming

### Урок 15: Масштабирование

**Что покрывает:** k6-operator, distributed execution, K8s

```bash
cd lesson-15-scaling
kubectl apply -f k6-operator.yaml  # TestRun CRD
kubectl apply -f distributed.yaml  # Distributed test
```

**Примеры:**
- `k6-operator.yaml` — k6-operator TestRun
- `distributed.yaml` — distributed execution
- `monitoring.yaml` — мониторинг генераторов

### Урок 16: Продвинутые паттерны

**Что покрывает:** Cleanup, canary, anti-patterns, чек-лист

```bash
cd lesson-16-patterns
k6 run cleanup.js         # Cleanup тестовых данных
k6 run canary.js          # Канарейка в проде
```

**Примеры:**
- `cleanup.js` — cleanup в teardown
- `canary.js` — канарейка в production
- `data-isolation.js` — изоляция данных между тестами

### Урок 17: Финальный проект

**Что покрывает:** Полный пайплайн, Black Friday симуляция

```bash
cd lesson-17-final
k6 run black-friday-stress.js   # Stress-тест
k6 run full-pipeline.js         # Полный пайплайн
```

**Примеры:**
- `black-friday-stress.js` — stress-тест для пиковой нагрузки
- `full-pipeline.js` — полный пайплайн: smoke → load → stress
- `implementation-plan.md` — дорожная карта внедрения

## 🛠️ ShopStack Demo Application

### Что это?

Полнофункциональное e-commerce приложение для практики:
- 4 микросервиса (API, Auth, Payment, Inventory)
- PostgreSQL + Redis
- Prometheus + Grafana для мониторинга
- 100 тестовых пользователей + 1000 товаров

### Запуск

```bash
cd shopstack-app
docker-compose up -d

# Проверка
curl http://localhost:3000/health
curl http://localhost:3000/api/products

# Grafana
open http://localhost:3100
# Login: admin / admin
```

### API Endpoints

```bash
# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@example.com","password":"Test123!"}'

# Get products
curl http://localhost:3000/api/products

# Add to cart (requires auth)
curl -X POST http://localhost:3000/api/cart \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":1,"quantity":2}'
```

**Полная документация:** [shopstack-app/README.md](shopstack-app/README.md)

## 📊 Тестовые данные (Fixtures)

### Что включено

- **users.json** — 10,000 пользователей с реалистичными данными
- **products.json** — 1,000 товаров в разных категориях
- **addresses.json** — 5,000 адресов доставки

### Использование в тестах

```javascript
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const users = new SharedArray('users', function() {
  return JSON.parse(open('../fixtures/users.json'));
});

export default function() {
  const user = users[__VU % users.length];
  // Use user.email, user.password, etc.
}
```

### Генерация новых данных

```bash
cd fixtures
node generate-data.js --users 10000 --products 1000
```

## 🔧 Переменные окружения

Все примеры поддерживают следующие переменные:

```bash
BASE_URL=http://localhost:3000    # URL API Gateway
AUTH_URL=http://localhost:3001    # URL Auth Service
TEST_TOKEN=...                    # JWT токен (опционально)
WS_URL=ws://localhost:3000/ws     # WebSocket URL
GRPC_HOST=localhost:50051         # gRPC host
RUN_ID=test-$(date +%s)           # Уникальный ID прогона
```

**Пример использования:**

```bash
BASE_URL=https://staging.example.com k6 run lesson-05-first-smoke/smoke.js
```

## 📖 Требования

- **k6:** v0.48.0+ (рекомендуется latest)
- **Node.js:** 18+ (для скриптов генерации данных)
- **Docker:** 20.10+ (для ShopStack приложения)
- **kubectl:** 1.25+ (опционально, для Kubernetes примеров)

## 🐛 Troubleshooting

### k6 не находит файлы

Убедитесь, что запускаете k6 из корневой директории:

```bash
cd k6-course-examples
k6 run lesson-05-first-smoke/smoke.js  # ✅
```

### Ошибка "cannot find module"

Проверьте, что файл существует и путь относительный:

```javascript
// ❌ Неправильно
import {login} from "k6-course-examples/lib/auth.js";

// ✅ Правильно
import {login} from "../lib/auth.js";
```

### dropped_iterations > 0

Генератор не справляется с нагрузкой:

1. Уменьшите VUs или rate
2. Увеличьте maxVUs для arrival-rate executors
3. Добавьте ресурсов машине с k6
4. Используйте distributed execution

### ShopStack сервисы не стартуют

```bash
# Проверка логов
cd shopstack-app
docker-compose logs api

# Перезапуск
docker-compose down
docker-compose up -d

# Проверка health
docker-compose ps
```

## 🤝 Обратная связь

Нашли ошибку или есть предложение?

- **Issues:** https://github.com/potapov-me/k6-course-examples/issues
- **Discussions:** https://github.com/potapov-me/k6-course-examples/discussions
- **Email:** order@potapov.me

## 📄 Лицензия

MIT License — используйте свободно для обучения и работы.

## 🔗 Полезные ссылки

- **Курс:** https://potapov.me/education/courses/k6-load-testing
- **k6 Docs:** https://k6.io/docs/
- **k6 Community:** https://community.k6.io/
- **Grafana k6:** https://grafana.com/docs/k6/

---

Made with ❤️ for the k6 community by [Constantin Potapov](https://potapov.me)
