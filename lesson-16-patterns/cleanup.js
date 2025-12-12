/**
 * Cleanup pattern - очистка тестовых данных
 * Урок 16: Продвинутые паттерны и чек-лист внедрения
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const RUN_ID = __ENV.RUN_ID || `test-${Date.now()}`;

// Глобальный массив для tracking созданных ресурсов
let createdResources = {
  orders: [],
  carts: [],
  users: [],
};

export const options = {
  vus: 10,
  iterations: 50,
};

// Setup: подготовка перед тестом
export function setup() {
  console.log(`🚀 Test run ID: ${RUN_ID}`);
  console.log('📋 Setup: preparing test environment...');

  // Cleanup старых данных (если есть)
  const cleanupRes = http.del(`${BASE_URL}/admin/cleanup?runId=${RUN_ID}`);
  console.log(`🧹 Cleanup old data: ${cleanupRes.status}`);

  return { runId: RUN_ID, startTime: Date.now() };
}

// Main scenario
export default function(data) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Test-Run-ID': data.runId, // Маркируем все запросы
  };

  // Создаем заказ с уникальным ID
  const orderId = `${data.runId}-order-${__VU}-${__ITER}`;

  const orderRes = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({
      id: orderId,
      items: [
        { productId: 1, quantity: 2 },
      ],
      testRunId: data.runId, // Помечаем тестовым run ID
    }),
    { headers }
  );

  check(orderRes, {
    'order created': (r) => r.status === 201,
  });

  if (orderRes.status === 201) {
    const order = orderRes.json();
    // Сохраняем в глобальный state (НЕ работает в k6!)
    // createdResources.orders.push(order.id);
  }

  sleep(1);
}

// Teardown: cleanup после теста
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`\n⏱️  Test duration: ${duration}s`);
  console.log('🧹 Teardown: cleaning up test data...');

  // Cleanup по test run ID
  const cleanupRes = http.del(
    `${BASE_URL}/admin/cleanup?runId=${data.runId}`,
    null,
    {
      headers: { 'X-Admin-Token': __ENV.ADMIN_TOKEN },
      timeout: '30s', // Cleanup может занять время
    }
  );

  check(cleanupRes, {
    'cleanup successful': (r) => r.status === 200,
  });

  if (cleanupRes.status === 200) {
    const result = cleanupRes.json();
    console.log(`✅ Deleted: ${result.ordersDeleted} orders`);
    console.log(`✅ Deleted: ${result.cartsDeleted} carts`);
    console.log(`✅ Deleted: ${result.usersDeleted} users`);
  } else {
    console.error(`❌ Cleanup failed: ${cleanupRes.status}`);
    console.error(`Body: ${cleanupRes.body}`);
  }

  console.log('✨ Teardown complete!');
}

/**
 * Backend API для cleanup (пример):
 *
 * DELETE /admin/cleanup?runId=test-123
 *
 * Response:
 * {
 *   "ordersDeleted": 50,
 *   "cartsDeleted": 30,
 *   "usersDeleted": 10
 * }
 *
 * SQL пример:
 * DELETE FROM orders WHERE test_run_id = 'test-123';
 * DELETE FROM carts WHERE test_run_id = 'test-123';
 * DELETE FROM users WHERE email LIKE '%test-123%';
 *
 * Запуск:
 * RUN_ID=my-test-$(date +%s) ADMIN_TOKEN=secret k6 run cleanup.js
 */
