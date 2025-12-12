/**
 * Data Isolation - изоляция данных между тестами
 * Урок 16: Продвинутые паттерны
 */

import http from 'k6/http';
import { check } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Стратегия 1: Уникальные ID с префиксом
const RUN_ID = __ENV.RUN_ID || `run-${Date.now()}`;

// Стратегия 2: Namespace
const NAMESPACE = __ENV.NAMESPACE || `test-ns-${Date.now()}`;

export const options = {
  vus: 10,
  iterations: 20,
};

export default function() {
  // === Стратегия 1: Уникальные ID ===
  const orderId = `${RUN_ID}-${__VU}-${__ITER}`;
  const userId = `user-${RUN_ID}-${__VU}`;

  const order1 = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      id: orderId,
      userId: userId,
      items: [{ productId: 1, qty: 2 }],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(order1, {
    'strategy 1: order created': (r) => r.status === 201,
  });

  // === Стратегия 2: Namespace ===
  const order2 = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      namespace: NAMESPACE, // Backend изолирует по namespace
      items: [{ productId: 2, qty: 1 }],
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Namespace': NAMESPACE,
      },
    }
  );

  check(order2, {
    'strategy 2: order created': (r) => r.status === 201,
  });

  // === Стратегия 3: UUID ===
  const order3 = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      id: uuidv4(), // Гарантированно уникальный
      items: [{ productId: 3, qty: 1 }],
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(order3, {
    'strategy 3: order created': (r) => r.status === 201,
  });

  // === Стратегия 4: Separate database ===
  // Каждый тест использует свою БД
  const order4 = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ items: [{ productId: 4, qty: 1 }] }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Database': `test_db_${RUN_ID}`, // Backend переключает БД
      },
    }
  );

  check(order4, {
    'strategy 4: order created': (r) => r.status === 201,
  });
}

export function teardown() {
  // Cleanup namespace
  http.del(`${BASE_URL}/admin/namespaces/${NAMESPACE}`);

  // Cleanup database
  http.del(`${BASE_URL}/admin/databases/test_db_${RUN_ID}`);
}

/**
 * Сравнение стратегий:
 *
 * | Стратегия | Сложность | Изоляция | Performance |
 * |-----------|-----------|----------|-------------|
 * | Unique ID | Низкая    | Средняя  | ✅ Высокий  |
 * | Namespace | Средняя   | Высокая  | ✅ Высокий  |
 * | UUID      | Низкая    | Высокая  | ✅ Высокий  |
 * | Separate DB | Высокая | 100%     | ⚠️ Средний |
 *
 * Рекомендация:
 * - Dev/Staging: Unique ID или Namespace
 * - CI/CD: Separate DB (каждый pipeline = своя БД)
 * - Production-like: Namespace с cleanup в teardown
 */
