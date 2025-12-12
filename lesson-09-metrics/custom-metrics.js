// Урок 7: Кастомные метрики
// Создание собственных метрик для бизнес-логики

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// Кастомные метрики
const checkoutLatency = new Trend("checkout_latency");
const checkoutErrors = new Rate("checkout_errors");
const ordersCreated = new Counter("orders_created");
const paymentFailures = new Rate("payment_failures");

export const options = {
  scenarios: {
    checkout: {
      executor: "constant-arrival-rate",
      rate: 50,
      timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 25,
      maxVUs: 100,
      tags: { flow: "checkout" },
    },
  },
  thresholds: {
    // Стандартные метрики
    http_req_duration: ["p(95)<600", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],

    // Кастомные метрики
    checkout_latency: ["p(95)<550", "p(99)<900"],
    checkout_errors: ["rate<0.02"],
    orders_created: ["count>100"], // Минимум 100 заказов за тест
    payment_failures: ["rate<0.01"], // < 1% неудачных платежей
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  const startTime = Date.now();

  // Checkout request
  const res = http.post(
    `${BASE_URL}/public/crocodiles/`,
    JSON.stringify({
      name: `Order-${__VU}-${__ITER}`,
      sex: "M",
      date_of_birth: "2020-01-01",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { endpoint: "checkout" },
    }
  );

  const duration = Date.now() - startTime;

  // Записываем кастомные метрики
  checkoutLatency.add(duration, { endpoint: "checkout" });
  checkoutErrors.add(res.status >= 400 || res.status === 0);

  const success = check(res, {
    "checkout status 200 or 201": (r) => r.status === 200 || r.status === 201,
    "has id": (r) => {
      const body = JSON.parse(r.body || "{}");
      return body.id !== undefined;
    },
  });

  if (success) {
    ordersCreated.add(1);
    paymentFailures.add(0); // Успешная оплата
  } else {
    paymentFailures.add(1); // Неудачная оплата
  }

  sleep(1);
}

// После теста в summary будут видны:
// - checkout_latency (p95, p99)
// - checkout_errors (rate)
// - orders_created (count)
// - payment_failures (rate)
