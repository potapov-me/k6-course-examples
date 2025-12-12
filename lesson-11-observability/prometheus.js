// Урок 8: Интеграция с Prometheus
// Отправка метрик k6 в Prometheus для визуализации в Grafana

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const e2eLatency = new Trend("e2e_latency");

export const options = {
  scenarios: {
    load_test: {
      executor: "ramping-vus",
      stages: [
        { duration: "2m", target: 20 },
        { duration: "10m", target: 20 },
        { duration: "2m", target: 0 },
      ],
      tags: {
        test_id: "load-test-v1",
        environment: "staging",
        release: __ENV.RELEASE || "unknown",
      },
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<600"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  const res = http.get(`${BASE_URL}/public/crocodiles/`, {
    tags: {
      endpoint: "/api/crocodiles",
      method: "GET",
    },
  });

  e2eLatency.add(res.timings.duration, res.tags);

  check(res, {
    "status 200": (r) => r.status === 200,
  });

  sleep(1);
}

// Запуск с отправкой в Prometheus:
//
// k6 run prometheus.js \
//   --out prometheus-remote-write=http://localhost:9090/api/v1/write \
//   --summary-export summary.json
//
// В Grafana можно строить графики по метрикам:
// - http_req_duration{test_id="load-test-v1",endpoint="/api/crocodiles"}
// - http_req_failed{environment="staging"}
// - e2e_latency{release="v1.2.3"}
