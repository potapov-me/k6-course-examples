/**
 * Chaos Engineering с Toxiproxy (локальный вариант)
 * Урок 13: Chaos Engineering под нагрузкой
 *
 * Требования:
 * 1. Установите Toxiproxy: brew install toxiproxy
 * 2. Запустите: toxiproxy-server
 * 3. Настройте прокси для вашего API
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOXIPROXY_API = __ENV.TOXIPROXY_API || 'http://localhost:8474';

// Custom метрики для chaos
const chaosInjected = new Counter('chaos_injected');
const resilienceRate = new Rate('resilience_rate');

export const options = {
  scenarios: {
    // Baseline: нормальная нагрузка
    baseline: {
      executor: 'constant-vus',
      vus: 20,
      duration: '2m',
      startTime: '0s',
      exec: 'normalLoad',
    },

    // Chaos: инъекция латентности
    latency_chaos: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '2m',
      exec: 'latencyChaos',
    },

    // Chaos: потеря пакетов
    packet_loss_chaos: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '3m',
      exec: 'packetLossChaos',
    },

    // Recovery: после хаоса
    recovery: {
      executor: 'constant-vus',
      vus: 20,
      duration: '1m',
      startTime: '4m',
      exec: 'normalLoad',
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.05'],            // Макс 5% failures (толерантность к chaos)
    'http_req_duration{type:baseline}': ['p(95)<500'],
    'http_req_duration{type:chaos}': ['p(95)<2000'], // Допускаем деградацию
    resilience_rate: ['rate>0.90'],           // Минимум 90% resilient
  },
};

// Утилита для управления Toxiproxy
function addToxic(proxyName, toxic) {
  const res = http.post(
    `${TOXIPROXY_API}/proxies/${proxyName}/toxics`,
    JSON.stringify(toxic),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (res.status === 200) {
    console.log(`✅ Added toxic: ${toxic.type} to ${proxyName}`);
    chaosInjected.add(1, { type: toxic.type });
  } else {
    console.error(`❌ Failed to add toxic: ${res.status} ${res.body}`);
  }

  return res.status === 200;
}

function removeToxic(proxyName, toxicName) {
  const res = http.del(`${TOXIPROXY_API}/proxies/${proxyName}/toxics/${toxicName}`);

  if (res.status === 204) {
    console.log(`✅ Removed toxic: ${toxicName} from ${proxyName}`);
  }

  return res.status === 204;
}

// Сценарий 1: Нормальная нагрузка (baseline)
export function normalLoad() {
  const res = http.get(`${BASE_URL}/api/products`, {
    tags: { type: 'baseline' },
  });

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  resilienceRate.add(ok ? 1 : 0);
  sleep(1);
}

// Сценарий 2: Chaos с латентностью
export function latencyChaos() {
  // Инъекция латентности (один раз)
  if (__ITER === 0 && __VU === 1) {
    addToxic('shopstack-api', {
      name: 'latency_toxic',
      type: 'latency',
      attributes: {
        latency: 1000,  // 1s задержка
        jitter: 500,    // ±500ms jitter
      },
    });
  }

  const res = http.get(`${BASE_URL}/api/products`, {
    tags: { type: 'chaos', chaos_type: 'latency' },
    timeout: '5s', // Увеличенный timeout
  });

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'response despite latency': (r) => r.timings.duration < 5000,
  });

  resilienceRate.add(ok ? 1 : 0);
  sleep(1);

  // Удаление toxic (последняя итерация)
  if (__ITER === (__ENV.K6_ITERATIONS - 1) && __VU === 1) {
    removeToxic('shopstack-api', 'latency_toxic');
  }
}

// Сценарий 3: Chaos с потерей пакетов
export function packetLossChaos() {
  // Инъекция потери пакетов
  if (__ITER === 0 && __VU === 1) {
    addToxic('shopstack-api', {
      name: 'packet_loss_toxic',
      type: 'timeout',
      attributes: {
        timeout: 100, // 100ms timeout для 10% пакетов
      },
      toxicity: 0.1, // 10% пакетов
    });
  }

  const res = http.get(`${BASE_URL}/api/products`, {
    tags: { type: 'chaos', chaos_type: 'packet_loss' },
    timeout: '3s',
  });

  const ok = check(res, {
    'handled packet loss': (r) => r.status === 200 || r.status === 0, // 0 = timeout
  });

  resilienceRate.add(ok ? 1 : 0);
  sleep(1);

  // Удаление toxic
  if (__ITER === (__ENV.K6_ITERATIONS - 1) && __VU === 1) {
    removeToxic('shopstack-api', 'packet_loss_toxic');
  }
}

/**
 * Запуск:
 *
 * 1. Установите Toxiproxy:
 *    brew install toxiproxy
 *
 * 2. Запустите Toxiproxy server:
 *    toxiproxy-server
 *
 * 3. Создайте прокси для вашего API:
 *    toxiproxy-cli create shopstack-api -l localhost:28080 -u localhost:3000
 *
 * 4. Обновите BASE_URL в тесте:
 *    export BASE_URL=http://localhost:28080
 *
 * 5. Запустите тест:
 *    k6 run toxiproxy-example.js
 *
 * Результаты покажут:
 * - Baseline: нормальная производительность
 * - Latency chaos: деградация, но система работает
 * - Packet loss: частичные сбои
 * - Recovery: возврат к норме
 */
