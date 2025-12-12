/**
 * Конфигурация теста
 */

export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  authUrl: __ENV.AUTH_URL || 'http://localhost:3001',

  thresholds: {
    http_req_failed: ['rate<0.01'],       // < 1% errors
    http_req_duration: ['p(95)<500'],     // 95% < 500ms
    'http_req_duration{type:api}': ['p(95)<300'],
    'http_req_duration{type:auth}': ['p(95)<200'],
  },
};
