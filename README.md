# k6 Course Examples

Примеры кода для курса "k6: нагрузочное тестирование как система"

## Структура репозитория

```
k6-course-examples/
├── 01-smoke-tests/          # Урок 3: Первый smoke-тест
├── 02-load-tests/           # Урок 4: Executors и scenarios
├── 03-scenarios/            # Урок 4: Примеры разных executors
├── 04-traffic-modeling/     # Урок 5: Реалистичные user journeys
├── 05-advanced-js/          # Урок 6: Модульная архитектура
├── 06-metrics/              # Урок 7: Кастомные метрики
├── 07-observability/        # Урок 8: Интеграция с Grafana/Prometheus
├── 08-ci-cd/                # Урок 9: CI/CD конфиги
├── 09-websocket-grpc/       # Урок 10: WebSocket и gRPC
├── 10-kubernetes/           # Урок 11: k6-operator
├── 11-patterns/             # Урок 12: Best practices
├── data/                    # Тестовые данные (users, products)
├── lib/                     # Переиспользуемые утилиты
└── shopstack/               # Сквозной пример ShopStack
```

## Быстрый старт

### 1. Установите k6

**macOS:**
```bash
brew install k6
```

**Docker:**
```bash
docker pull grafana/k6:latest
```

**Linux:**
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 2. Запустите первый тест

```bash
# Простой smoke-тест
k6 run 01-smoke-tests/basic-smoke.js

# С переменными окружения
BASE_URL=https://test-api.k6.io k6 run 01-smoke-tests/api-smoke.js

# Экспорт результатов
k6 run 01-smoke-tests/basic-smoke.js --summary-export summary.json
```

### 3. Настройка для вашего проекта

1. Скопируйте нужный пример
2. Замените `BASE_URL` на URL вашего API
3. Адаптируйте endpoints и checks под ваш проект
4. Запустите и соберите baseline

## Примеры по урокам

### Урок 3: Первый smoke-тест
- `01-smoke-tests/basic-smoke.js` — базовый smoke
- `01-smoke-tests/api-smoke.js` — smoke для API
- `01-smoke-tests/with-checks.js` — с проверками ответов

### Урок 4: Executors и scenarios
- `02-load-tests/ramping-vus.js` — load-тест с ramping-vus
- `02-load-tests/constant-arrival-rate.js` — фиксированный RPS
- `03-scenarios/multiple-scenarios.js` — несколько scenarios

### Урок 5: Моделирование трафика
- `04-traffic-modeling/user-journeys.js` — reader/buyer/admin flows
- `04-traffic-modeling/realistic-mix.js` — реалистичный микс

### Урок 6: Продвинутый JavaScript
- `05-advanced-js/modular/` — модульная структура
- `05-advanced-js/shared-data.js` — работа с SharedArray

### Урок 7: Метрики и thresholds
- `06-metrics/custom-metrics.js` — кастомные метрики
- `06-metrics/business-metrics.js` — бизнес-метрики

### Урок 8: Observability
- `07-observability/prometheus.js` — интеграция с Prometheus
- `07-observability/traceparent.js` — корреляция трейсов

### Урок 9: CI/CD
- `08-ci-cd/.gitlab-ci.yml` — GitLab CI
- `08-ci-cd/.github/` — GitHub Actions
- `08-ci-cd/compare-baseline.js` — сравнение с baseline

### Урок 10: WebSocket и gRPC
- `09-websocket-grpc/websocket.js` — WebSocket тест
- `09-websocket-grpc/grpc.js` — gRPC тест

### Урок 11: Kubernetes
- `10-kubernetes/k6-operator.yaml` — k6-operator TestRun
- `10-kubernetes/distributed.yaml` — distributed execution

### Урок 12: Patterns
- `11-patterns/cleanup.js` — cleanup тестовых данных
- `11-patterns/canary.js` — канарейка в проде

## Сквозной пример: ShopStack

`shopstack/` содержит полный пример e-commerce платформы:

- `shopstack/smoke.js` — smoke-тест
- `shopstack/load-checkout.js` — load-тест checkout flow
- `shopstack/stress.js` — stress-тест для Black Friday
- `shopstack/docker-compose.yml` — локальное окружение

## Тестовые данные

`data/` содержит фикстуры:
- `users.json` — тестовые пользователи
- `products.json` — тестовые товары
- `generate-data.js` — генератор тестовых данных

## Переиспользуемые утилиты

`lib/` содержит общие функции:
- `auth.js` — авторизация
- `http-client.js` — обертка над http
- `helpers.js` — вспомогательные функции

## Переменные окружения

Все примеры поддерживают следующие переменные:

```bash
BASE_URL=https://your-api.com    # URL тестируемого API
TEST_TOKEN=...                   # JWT токен для авторизации
WS_URL=wss://your-ws.com         # WebSocket URL
GRPC_HOST=grpc.your-api.com      # gRPC хост
RUN_ID=test-$(date +%s)          # Уникальный ID прогона
```

## Требования

- k6 v0.45.0+
- Node.js 18+ (для скриптов генерации данных)
- Docker (опционально, для ShopStack)

## Troubleshooting

### k6 не находит файлы

Убедитесь, что запускаете k6 из корневой директории примеров:

```bash
cd k6-course-examples
k6 run 01-smoke-tests/basic-smoke.js
```

### Ошибка "cannot find module"

Проверьте, что файл существует и путь указан правильно:

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

## Обратная связь

Нашли ошибку или есть предложение? Создайте issue или отправьте pull request.

## Лицензия

MIT License - используйте свободно для обучения и работы.
