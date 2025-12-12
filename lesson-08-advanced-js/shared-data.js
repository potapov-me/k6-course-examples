/**
 * Использование SharedArray для экономии RAM
 * Урок 08: Продвинутая разработка сценариев на JavaScript в k6
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// ❌ Плохо: каждый VU загружает свою копию
// const users = JSON.parse(open('../fixtures/users.json'));

// ✅ Хорошо: одна копия в RAM для всех VU
const users = new SharedArray('users', function() {
  return JSON.parse(open('../fixtures/users.json'));
});

const products = new SharedArray('products', function() {
  return JSON.parse(open('../fixtures/products.json'));
});

export const options = {
  vus: 50,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_URL = __ENV.AUTH_URL || 'http://localhost:3001';

export default function() {
  // Round-robin выбор пользователя
  const user = users[__VU % users.length];

  // Login
  const loginRes = http.post(
    `${AUTH_URL}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login success': (r) => r.status === 200,
    'has token': (r) => r.json('token') !== undefined,
  });

  const token = loginRes.json('token');
  if (!token) {
    return;
  }

  sleep(1);

  // Random выбор товара
  const product = products[Math.floor(Math.random() * products.length)];

  // Add to cart
  const addToCartRes = http.post(
    `${BASE_URL}/api/cart`,
    JSON.stringify({
      productId: product.id,
      quantity: Math.floor(Math.random() * 3) + 1,
    }),
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(addToCartRes, {
    'add to cart success': (r) => r.status === 200,
  });

  sleep(1);
}

/**
 * Сравнение использования RAM:
 *
 * БЕЗ SharedArray (100 VU × 10MB users.json):
 * RAM = 100 × 10MB = 1000MB (1GB)
 *
 * С SharedArray (100 VU × 10MB users.json):
 * RAM = 1 × 10MB = 10MB
 *
 * Экономия: 99%!
 */
