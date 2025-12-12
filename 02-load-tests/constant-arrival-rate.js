// Урок 4: Load-тест с constant-arrival-rate
// Фиксированный RPS независимо от latency сервера

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    api_load: {
      executor: "constant-arrival-rate",
      rate: 100, // 100 RPS
      timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 50, // Предварительно выделенные VU
      maxVUs: 200, // Максимум VU (запас x2)
      tags: { flow: "api" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<800"],
    http_req_failed: ["rate<0.01"],
    dropped_iterations: ["count==0"], // КРИТИЧНО: должно быть 0
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  const res = http.get(`${BASE_URL}/public/crocodiles/`);

  check(res, {
    "status 200": (r) => r.status === 200,
  });

  sleep(0.1); // Короткий think time для API
}

// Troubleshooting:
// Если dropped_iterations > 0:
// 1. Увеличьте maxVUs
// 2. Проверьте CPU генератора (должно быть < 85%)
// 3. Уменьшите rate или упростите сценарий
