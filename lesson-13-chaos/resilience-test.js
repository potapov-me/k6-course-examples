/**
 * Тестирование отказоустойчивости системы
 * Урок 13: Chaos Engineering под нагрузкой
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Custom метрики для resilience
const retryAttempts = new Counter('retry_attempts');
const successAfterRetry = new Counter('success_after_retry');
const circuitBreakerOpened = new Counter('circuit_breaker_opened');
const fallbackUsed = new Counter('fallback_used');
const resilienceScore = new Rate('resilience_score');
const recoveryTime = new Trend('recovery_time');

export const options = {
  scenarios: {
    resilience_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '5m', target: 50 },   // Sustained load
        { duration: '1m', target: 100 },  // Spike
        { duration: '2m', target: 100 },  // High load
        { duration: '1m', target: 0 },    // Ramp down
      ],
    },
  },

  thresholds: {
    http_req_failed: ['rate<0.10'],           // Макс 10% failures
    resilience_score: ['rate>0.85'],          // Минимум 85% resilient
    recovery_time: ['p(95)<5000'],            // 95% восстановлений < 5s
    retry_attempts: ['count<1000'],           // Не более 1000 ретраев за тест
  },
};

// Retry с экспоненциальным backoff
function retryRequest(url, maxRetries = 3) {
  let attempt = 0;
  let backoff = 100; // Начальная задержка 100ms

  while (attempt < maxRetries) {
    const startTime = new Date();
    const res = http.get(url, {
      timeout: '3s',
      tags: { retry_attempt: attempt },
    });

    if (res.status === 200) {
      if (attempt > 0) {
        // Успешный retry
        const recovTime = new Date() - startTime;
        recoveryTime.add(recovTime);
        successAfterRetry.add(1);
        console.log(`✅ Success after ${attempt} retries (${recovTime}ms)`);
      }
      return res;
    }

    // Retry с backoff
    retryAttempts.add(1);
    console.warn(`⚠️ Attempt ${attempt + 1} failed: ${res.status}. Retrying in ${backoff}ms...`);
    sleep(backoff / 1000);

    attempt++;
    backoff *= 2; // Exponential backoff: 100ms, 200ms, 400ms
  }

  // Все попытки исчерпаны
  console.error(`❌ All ${maxRetries} retries failed`);
  return null;
}

// Circuit Breaker паттерн
class CircuitBreaker {
  constructor(threshold = 5, timeout = 10000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        console.warn('⚡ Circuit breaker OPEN - request blocked');
        circuitBreakerOpened.add(1);
        return null;
      }
      // Переход в HALF_OPEN для проверки
      this.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker HALF_OPEN - trying request');
    }

    const result = fn();

    if (result && result.status === 200) {
      // Успех - сброс счетчика
      this.failureCount = 0;
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        console.log('✅ Circuit breaker CLOSED - recovered');
      }
    } else {
      // Failure - инкремент счетчика
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.error(`🔴 Circuit breaker OPEN - too many failures (${this.failureCount})`);
      }
    }

    return result;
  }
}

const productsCircuitBreaker = new CircuitBreaker(5, 10000);

// Fallback данные
const FALLBACK_PRODUCTS = [
  { id: 1, name: 'Fallback Product 1', price: 99.99 },
  { id: 2, name: 'Fallback Product 2', price: 149.99 },
];

export default function() {
  // 1. Попытка запроса через Circuit Breaker
  const res = productsCircuitBreaker.call(() =>
    http.get(`${BASE_URL}/api/products`, {
      timeout: '2s',
      tags: { pattern: 'circuit_breaker' },
    })
  );

  // 2. Если Circuit Breaker открыт или запрос провалился - используем retry
  let finalRes = res;
  if (!res || res.status !== 200) {
    finalRes = retryRequest(`${BASE_URL}/api/products`, 3);
  }

  // 3. Если retry не помог - используем fallback
  let products = [];
  if (!finalRes || finalRes.status !== 200) {
    console.warn('⚠️ Using fallback data');
    fallbackUsed.add(1);
    products = FALLBACK_PRODUCTS;
  } else {
    try {
      products = finalRes.json('data') || [];
    } catch (e) {
      products = FALLBACK_PRODUCTS;
      fallbackUsed.add(1);
    }
  }

  // 4. Проверка resilience
  const isResilient = products.length > 0; // Получили данные любым способом
  resilienceScore.add(isResilient ? 1 : 0);

  check(finalRes, {
    'resilient response': () => isResilient,
    'has products': () => products.length > 0,
  });

  sleep(Math.random() * 2 + 1);
}

/**
 * Паттерны отказоустойчивости:
 *
 * 1. **Retry с exponential backoff**
 *    - Повторяем неудачные запросы
 *    - Увеличиваем задержку между попытками
 *
 * 2. **Circuit Breaker**
 *    - Открываем "цепь" при многих ошибках
 *    - Блокируем запросы на время восстановления
 *    - Пробуем восстановиться через timeout
 *
 * 3. **Fallback**
 *    - Используем кешированные данные
 *    - Возвращаем дефолтные значения
 *    - Деградация функциональности
 *
 * 4. **Timeout**
 *    - Ограничиваем время ожидания
 *    - Fail fast вместо долгого ожидания
 *
 * Запуск:
 * k6 run resilience-test.js
 *
 * Симуляция сбоя:
 * 1. Остановите сервис: docker-compose stop api
 * 2. Запустите тест
 * 3. Верните сервис: docker-compose start api
 * 4. Наблюдайте recovery
 */
