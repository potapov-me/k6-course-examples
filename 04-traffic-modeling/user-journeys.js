// Урок 5: Реалистичные user journeys
// Моделирование разных типов пользователей: reader, buyer, admin

import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "https://test-api.k6.io";

export const options = {
  scenarios: {
    // 70% пользователей — readers (только читают)
    readers: {
      executor: "ramping-arrival-rate",
      startRate: 50,
      timeUnit: "1s",
      preAllocatedVUs: 30,
      maxVUs: 150,
      stages: [
        { target: 140, duration: "5m" }, // Ramp-up
        { target: 140, duration: "20m" }, // Plateau
        { target: 0, duration: "3m" }, // Ramp-down
      ],
      tags: { flow: "reader" },
      exec: "readerFlow",
    },

    // 25% пользователей — buyers (покупают)
    buyers: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 20,
      maxVUs: 100,
      stages: [
        { target: 50, duration: "5m" },
        { target: 50, duration: "20m" },
        { target: 0, duration: "3m" },
      ],
      tags: { flow: "buyer" },
      exec: "buyerFlow",
    },

    // 5% пользователей — admins
    admins: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "20m",
      preAllocatedVUs: 5,
      maxVUs: 20,
      tags: { flow: "admin" },
      exec: "adminFlow",
    },
  },
  thresholds: {
    // Критичные thresholds для buyer flow
    "http_req_duration{flow:buyer}": ["p(95)<700"],
    "checks{flow:buyer}": ["rate>0.97"],
    http_req_failed: ["rate<0.01"],
  },
};

// Reader flow: browse → search → view
export function readerFlow() {
  // Browse catalog
  let res = http.get(`${BASE_URL}/public/crocodiles/`);
  check(res, {
    "catalog loaded": (r) => r.status === 200,
  });
  sleep(1 + Math.random()); // Think time 1-2s

  // View specific item
  res = http.get(`${BASE_URL}/public/crocodiles/1/`);
  check(res, {
    "item loaded": (r) => r.status === 200,
  });
  sleep(2 + Math.random()); // Think time 2-3s
}

// Buyer flow: login → browse → add to cart → checkout
export function buyerFlow() {
  // Simplified: в реальности здесь авторизация
  const res = http.get(`${BASE_URL}/public/crocodiles/`);
  check(res, {
    "buyer catalog loaded": (r) => r.status === 200,
  });

  sleep(2); // Think time перед покупкой
}

// Admin flow: управление контентом
export function adminFlow() {
  const res = http.get(`${BASE_URL}/public/crocodiles/`);
  check(res, {
    "admin access": (r) => r.status === 200,
  });

  sleep(3); // Admins действуют медленнее
}
