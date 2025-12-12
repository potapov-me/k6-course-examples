// Урок 8: Корреляция с distributed tracing
// Добавление traceparent header для связи метрик k6 с трейсами в Jaeger/Tempo

import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Trend } from "k6/metrics";

const e2eLatency = new Trend("e2e_request_latency");

export const options = {
  scenarios: {
    traced_load: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1s",
      duration: "5m",
      preAllocatedVUs: 15,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<800"],
    e2e_request_latency: ["p(99)<1200"],
  },
};

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export default function () {
  // Генерируем trace_id из iteration number
  const traceId = exec.vu.iterationInTest.toString(16).padStart(32, "0");
  const spanId = Date.now().toString(16).padStart(16, "0");

  // W3C Trace Context format
  const traceparent = `00-${traceId}-${spanId}-01`;

  const startTime = Date.now();

  const res = http.get(`${BASE_URL}/public/crocodiles/`, {
    headers: {
      traceparent: traceparent,
      "X-Request-ID": `k6-${__VU}-${__ITER}`,
    },
    tags: {
      trace_id: traceId,
      request_id: `k6-${__VU}-${__ITER}`,
    },
  });

  const duration = Date.now() - startTime;
  e2eLatency.add(duration, { trace_id: traceId });

  check(res, {
    "status 200": (r) => r.status === 200,
  });

  // Логируем trace_id для поиска в Jaeger/Tempo
  if (__ITER === 0) {
    console.log(`VU ${__VU} trace_id: ${traceId}`);
  }

  sleep(1);
}

// Как использовать:
//
// 1. Запустите тест
// 2. В логах найдите trace_id
// 3. Откройте Jaeger UI: http://localhost:16686
// 4. Найдите trace по trace_id
// 5. Увидите полную цепочку: k6 request → API → БД → external services
//
// В Grafana можно связать метрики с трейсами:
// - http_req_duration{trace_id="..."}
// - Кликнуть на точку графика → перейти в Tempo/Jaeger по trace_id
