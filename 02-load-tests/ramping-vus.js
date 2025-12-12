// Урок 4: Load-тест с ramping-vus
// Реалистичный рост пользователей: warmup → ramp-up → plateau → ramp-down

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    load_test: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 10 }, // Warmup: малая нагрузка
        { duration: "5m", target: 50 }, // Ramp-up: рост до целевой
        { duration: "10m", target: 50 }, // Plateau: основной тест
        { duration: "2m", target: 0 }, // Ramp-down: плавное завершение
      ],
      gracefulRampDown: "30s",
      tags: { flow: "load-test" },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<600", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
    "checks{flow:load-test}": ["rate>0.97"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  const res = http.get(`${BASE_URL}/public/crocodiles/`);

  check(res, {
    "status 200": (r) => r.status === 200,
    "has data": (r) => {
      const body = JSON.parse(r.body || "[]");
      return body.length > 0;
    },
  });

  sleep(1 + Math.random()); // Think time 1-2s
}
