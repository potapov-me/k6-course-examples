# ShopStack E-Commerce Demo Application

Демо-приложение для курса "k6: нагрузочное тестирование как система"

## Архитектура

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────────────────────────────────────┐
│           API Gateway (Port 3000)           │
└──┬───────┬────────┬────────┬────────────────┘
   │       │        │        │
   ▼       ▼        ▼        ▼
┌─────┐ ┌────────┐ ┌────────┐ ┌───────────┐
│Auth │ │Payment │ │Inventor│ │PostgreSQL │
│3001 │ │3002    │ │y 3003  │ │5432       │
└─────┘ └────────┘ └────────┘ └─────┬─────┘
   │       │         │              │
   └───────┴─────────┴──────────────┘
                 │
         ┌───────▼────────┐
         │ Redis (Cache)  │
         │     6379       │
         └────────────────┘
```

## Быстрый старт

### 1. Запустите все сервисы

```bash
docker-compose up -d
```

### 2. Проверьте здоровье сервисов

```bash
# Проверка всех сервисов
curl http://localhost:3000/health

# API Gateway
curl http://localhost:3000/api/products

# Auth Service
curl http://localhost:3001/health

# Payment Service
curl http://localhost:3002/health

# Inventory Service
curl http://localhost:3003/health
```

### 3. Откройте Grafana

```bash
open http://localhost:3100
# Login: admin / admin
```

## API Endpoints

### Auth Service (3001)

```bash
# Register new user
POST /auth/register
{
  "email": "user@example.com",
  "password": "Password123!",
  "name": "John Doe"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "Password123!"
}
Response: { "token": "jwt_token_here" }

# Get current user
GET /auth/me
Headers: { "Authorization": "Bearer jwt_token" }
```

### API Gateway (3000)

```bash
# List products
GET /api/products?page=1&limit=20

# Get product by ID
GET /api/products/:id

# Search products
GET /api/products/search?q=laptop

# Get cart
GET /api/cart
Headers: { "Authorization": "Bearer jwt_token" }

# Add to cart
POST /api/cart
Headers: { "Authorization": "Bearer jwt_token" }
{
  "productId": 123,
  "quantity": 2
}

# Checkout
POST /api/orders/checkout
Headers: { "Authorization": "Bearer jwt_token" }
{
  "cartId": 456,
  "paymentMethod": "card"
}
```

### Payment Service (3002)

```bash
# Process payment
POST /payments/process
{
  "orderId": 789,
  "amount": 99.99,
  "currency": "USD",
  "method": "card",
  "cardToken": "tok_visa_test"
}
```

### Inventory Service (3003)

```bash
# Check stock
GET /inventory/check/:productId

# Reserve inventory
POST /inventory/reserve
{
  "productId": 123,
  "quantity": 2
}

# Release reservation
POST /inventory/release/:reservationId
```

## Тестовые данные

После запуска БД автоматически заполняется тестовыми данными:

- **Пользователи:** 100 тестовых пользователей (test1@example.com - test100@example.com, пароль: Test123!)
- **Товары:** 1000 товаров в разных категориях
- **Инвентарь:** Случайное количество на складе (0-100 единиц)

### Тестовые пользователи

```javascript
// k6 test example
import http from 'k6/http';

export default function() {
  // Login as test user
  const loginRes = http.post('http://localhost:3001/auth/login', JSON.stringify({
    email: 'test1@example.com',
    password: 'Test123!'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });

  const token = loginRes.json('token');

  // Use token for authenticated requests
  http.get('http://localhost:3000/api/cart', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Конфигурация для нагрузочных тестов

### Базовые настройки

```javascript
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Warmup
    { duration: '1m', target: 50 },   // Normal load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],     // < 1% failures
    http_req_duration: ['p(95)<500'],   // 95% < 500ms
  },
};
```

### Реалистичные сценарии

**Reader (70%):** Просмотр товаров, поиск
**Buyer (25%):** Добавление в корзину, оформление заказа
**Admin (5%):** Управление инвентарем

```javascript
export const options = {
  scenarios: {
    reader: {
      executor: 'constant-vus',
      vus: 70,
      duration: '5m',
      exec: 'readerJourney',
    },
    buyer: {
      executor: 'constant-vus',
      vus: 25,
      duration: '5m',
      exec: 'buyerJourney',
    },
    admin: {
      executor: 'constant-vus',
      vus: 5,
      duration: '5m',
      exec: 'adminJourney',
    },
  },
};
```

## Мониторинг

### Prometheus Metrics

Все сервисы экспортируют метрики на `/metrics`:

- `http_requests_total` — общее количество запросов
- `http_request_duration_seconds` — время ответа
- `db_queries_total` — количество запросов к БД
- `cache_hits_total` — попадания в кэш
- `cache_misses_total` — промахи кэша

### Grafana Dashboards

Доступны преднастроенные дашборды:

1. **ShopStack Overview** — общий обзор
2. **API Performance** — метрики API
3. **Database Performance** — метрики PostgreSQL
4. **Cache Performance** — метрики Redis

## Troubleshooting

### Сервисы не стартуют

```bash
# Проверка логов
docker-compose logs api
docker-compose logs postgres

# Перезапуск
docker-compose down
docker-compose up -d
```

### Ошибка подключения к БД

```bash
# Подождите пока PostgreSQL запустится
docker-compose ps
# Должен быть healthy статус

# Проверка подключения
docker-compose exec postgres psql -U shopstack -c "SELECT 1"
```

### Очистка данных

```bash
# Полная очистка (удаление volumes)
docker-compose down -v

# Перезапуск с чистыми данными
docker-compose up -d
```

## Разработка

### Структура проекта

```
shopstack-app/
├── docker-compose.yml
├── services/
│   ├── api/              # API Gateway
│   ├── auth/             # Auth Service
│   ├── payment/          # Payment Service
│   └── inventory/        # Inventory Service
├── db/
│   ├── init.sql          # Database schema
│   └── seeds/            # Test data
├── prometheus/
│   └── prometheus.yml    # Prometheus config
└── grafana/
    ├── provisioning/     # Auto-provisioning
    └── dashboards/       # Pre-configured dashboards
```

### Локальная разработка сервиса

```bash
# Запустить только БД и Redis
docker-compose up postgres redis -d

# Запустить сервис локально
cd services/api
npm install
npm run dev
```

## Production-like нагрузка

### Black Friday симуляция

```bash
# Запустите stress-тест
k6 run ../lesson-17-final/black-friday-stress.js

# Мониторинг в реальном времени
open http://localhost:3100/d/shopstack-overview
```

### Chaos Testing

```bash
# Остановите один сервис для теста resilience
docker-compose stop payment

# Запустите тест
k6 run ../lesson-13-chaos/resilience-test.js

# Верните сервис
docker-compose start payment
```

## Лицензия

MIT License - используйте для обучения и экспериментов.
