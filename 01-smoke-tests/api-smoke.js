// Урок 3: Smoke-тест для API с проверками
// Проверяет критические endpoints вашего API

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    smoke: {
      executor: "shared-iterations",
      iterations: 10,
      vus: 2,
      maxDuration: "2m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // < 5% ошибок
    http_req_duration: ["p(95)<1000"], // p95 < 1s
    checks: ["rate>0.95"], // > 95% проверок прошли
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  // 1. Health check endpoint
  let res = http.get(`${BASE_URL}/public/crocodiles/`);
  check(res, {
    "health check is 200": (r) => r.status === 200,
  });

  sleep(0.5);

  // 2. Get specific resource
  res = http.get(`${BASE_URL}/public/crocodiles/1/`);
  check(res, {
    "get crocodile is 200": (r) => r.status === 200,
    "has id field": (r) => {
      const body = JSON.parse(r.body || "{}");
      return body.id !== undefined;
    },
  });

  sleep(1);
}
