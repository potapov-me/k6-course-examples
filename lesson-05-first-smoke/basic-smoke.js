// Урок 3: Первый smoke-тест
// Базовый smoke-тест для проверки работоспособности API

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 3,
  duration: "2m",
  thresholds: {
    http_req_failed: ["rate<0.02"], // < 2% ошибок
    http_req_duration: ["p(95)<800"], // p95 < 800ms
    checks: ["rate>0.97"], // > 97% проверок прошли
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  // Health check
  const res = http.get(`${BASE_URL}/public/crocodiles/`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has crocodiles": (r) => {
      const body = JSON.parse(r.body || "[]");
      return body.length > 0;
    },
  });

  sleep(1); // Think time
}
