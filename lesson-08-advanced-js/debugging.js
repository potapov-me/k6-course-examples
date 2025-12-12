/**
 * Отладка k6 тестов
 * Урок 08: Продвинутая разработка сценариев на JavaScript в k6
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom метрики для отладки
const debugCounter = new Counter('debug_events');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function() {
  // 1. Логирование переменных окружения (один раз)
  if (__ITER === 0 && __VU === 1) {
    console.log('=== Environment ===');
    console.log('BASE_URL:', BASE_URL);
    console.log('VU:', __VU);
    console.log('ITER:', __ITER);
  }

  // 2. Логирование запросов
  console.log(`[VU ${__VU}] [ITER ${__ITER}] Making request to ${BASE_URL}/api/products`);

  const res = http.get(`${BASE_URL}/api/products`);

  // 3. Детальное логирование ответа
  console.log(`[VU ${__VU}] Status: ${res.status}, Duration: ${res.timings.duration}ms`);

  // 4. Логирование ошибок
  if (res.status !== 200) {
    console.error(`[VU ${__VU}] ERROR: Expected 200, got ${res.status}`);
    console.error('Response body:', res.body);
    debugCounter.add(1, { type: 'error', status: res.status });
  }

  // 5. Условный breakpoint (для локальной отладки)
  if (res.status >= 500) {
    console.warn('⚠️ Server error detected! Slowing down...');
    sleep(5); // Пауза для анализа
  }

  // 6. Проверки с детальными сообщениями
  const checksOk = check(res, {
    'status is 200': (r) => {
      const ok = r.status === 200;
      if (!ok) {
        console.error(`Check failed: status is ${r.status}, expected 200`);
      }
      return ok;
    },
    'response time < 500ms': (r) => {
      const ok = r.timings.duration < 500;
      if (!ok) {
        console.warn(`Slow response: ${r.timings.duration}ms`);
      }
      return ok;
    },
    'has products': (r) => {
      try {
        const data = r.json('data');
        const ok = Array.isArray(data) && data.length > 0;
        if (!ok) {
          console.error('Check failed: no products in response');
        }
        return ok;
      } catch (e) {
        console.error('Check failed: invalid JSON', e.message);
        return false;
      }
    },
  });

  // 7. Трекинг неудачных проверок
  if (!checksOk) {
    debugCounter.add(1, { type: 'check_failed' });
  }

  sleep(1);
}

/**
 * Советы по отладке:
 *
 * 1. Используйте console.log() для логирования
 * 2. Проверяйте переменные окружения через __ENV
 * 3. Логируйте VU и ITER для корреляции
 * 4. Используйте try/catch для обработки JSON ошибок
 * 5. Добавляйте custom метрики для трекинга проблем
 * 6. Запускайте с --verbose для детальных логов:
 *    k6 run --verbose debugging.js
 *
 * 7. Используйте --http-debug для debug HTTP:
 *    k6 run --http-debug="full" debugging.js
 */
