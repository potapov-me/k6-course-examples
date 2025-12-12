/**
 * Black Friday Stress Test
 * Урок 17: Финальный проект
 *
 * Симуляция пиковой нагрузки в Black Friday
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom метрики
const ordersCreated = new Counter('orders_created');
const orderValue = new Trend('order_value');
const conversionRate = new Rate('conversion_rate');
const cartAbandonment = new Rate('cart_abandonment');

// Test data
const users = new SharedArray('users', () => JSON.parse(open('../fixtures/users.json')));
const products = new SharedArray('products', () => JSON.parse(open('../fixtures/products.json')));

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    // Warmup: постепенный прогрев
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
      ],
      startTime: '0s',
      gracefulRampDown: '30s',
    },

    // Normal traffic: базовая нагрузка
    normal_traffic: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      startTime: '5m',
    },

    // Black Friday spike: пиковая нагрузка (10x)
    black_friday_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { duration: '2m', target: 500 },   // Быстрый рост
        { duration: '5m', target: 1000 },  // Пик
        { duration: '3m', target: 500 },   // Снижение
        { duration: '2m', target: 100 },   // Возврат к норме
      ],
      startTime: '15m',
      preAllocatedVUs: 500,
      maxVUs: 1500,
    },

    // Recovery: проверка восстановления
    recovery: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      startTime: '27m',
    },
  },

  thresholds: {
    // SLO-based thresholds
    http_req_failed: ['rate<0.05'],             // < 5% errors
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Допускаем деградацию

    // Бизнес-метрики
    conversion_rate: ['rate>0.10'],             // Минимум 10% conversion
    orders_created: ['count>1000'],             // Минимум 1000 заказов
    order_value: ['avg>50'],                    // Средний чек > $50

    // По сценариям
    'http_req_duration{scenario:warmup}': ['p(95)<500'],
    'http_req_duration{scenario:normal_traffic}': ['p(95)<800'],
    'http_req_duration{scenario:black_friday_spike}': ['p(95)<2000'],
    'http_req_duration{scenario:recovery}': ['p(95)<500'],
  },
};

// Утилита: авторизация
function loginUser(userIndex) {
  const user = users[userIndex % users.length];
  const res = http.post(
    `${AUTH_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'login' },
    }
  );

  if (res.status === 200) {
    return res.json('token');
  }
  return null;
}

// Main scenario
export default function() {
  const userIndex = Math.floor(Math.random() * users.length);

  // 1. Login
  const token = loginUser(userIndex);
  if (!token) {
    conversionRate.add(0);
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(Math.random() * 2 + 1);

  // 2. Browse products (читатели)
  const browseProbability = Math.random();

  if (browseProbability < 0.7) {
    // 70% просто смотрят
    http.get(`${BASE_URL}/api/products`, {
      headers,
      tags: { name: 'browse_products', type: 'reader' },
    });

    sleep(Math.random() * 3 + 2);
    conversionRate.add(0);
    return;
  }

  // 3. Add to cart (покупатели)
  const cartItems = [];
  const itemsCount = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < itemsCount; i++) {
    const product = products[Math.floor(Math.random() * products.length)];

    const addRes = http.post(
      `${BASE_URL}/api/cart`,
      JSON.stringify({
        productId: product.id,
        quantity: Math.floor(Math.random() * 2) + 1,
      }),
      {
        headers,
        tags: { name: 'add_to_cart', type: 'buyer' },
      }
    );

    if (addRes.status === 200) {
      cartItems.push(product);
    }

    sleep(Math.random() + 0.5);
  }

  // 4. Checkout (50% abandonment)
  if (Math.random() < 0.5) {
    // Cart abandonment
    cartAbandonment.add(1);
    conversionRate.add(0);
    sleep(1);
    return;
  }

  // Complete checkout
  const checkoutRes = http.post(
    `${BASE_URL}/api/orders/checkout`,
    JSON.stringify({
      paymentMethod: 'card',
    }),
    {
      headers,
      tags: { name: 'checkout', type: 'buyer' },
    }
  );

  const checkoutOk = check(checkoutRes, {
    'checkout success': (r) => r.status === 201,
  });

  if (checkoutOk) {
    ordersCreated.add(1);
    conversionRate.add(1);

    // Трекинг среднего чека
    try {
      const order = checkoutRes.json();
      orderValue.add(order.total || 0);
    } catch (e) {
      // Ignore JSON parse errors
    }
  } else {
    conversionRate.add(0);
  }

  sleep(1);
}

/**
 * Ожидаемые результаты:
 *
 * Warmup:
 * - http_req_duration p(95) < 500ms
 * - 0% errors
 *
 * Normal traffic:
 * - http_req_duration p(95) < 800ms
 * - < 1% errors
 *
 * Black Friday spike:
 * - http_req_duration p(95) < 2000ms (деградация ок)
 * - < 5% errors
 * - 1000+ orders created
 * - Conversion rate > 10%
 *
 * Recovery:
 * - http_req_duration p(95) < 500ms
 * - Система восстановилась
 *
 * Запуск:
 * k6 run --out json=black-friday-results.json black-friday-stress.js
 *
 * Мониторинг:
 * - Grafana: http://localhost:3100
 * - Prometheus: http://localhost:9090
 */
