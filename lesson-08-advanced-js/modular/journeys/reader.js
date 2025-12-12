/**
 * Reader journey - просмотр товаров
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from '../config.js';

export function readerJourney() {
  // Browse products
  const productsRes = http.get(`${config.baseUrl}/api/products`, {
    tags: { type: 'api', name: 'list_products' },
  });

  check(productsRes, {
    'products status is 200': (r) => r.status === 200,
    'has products': (r) => r.json('data').length > 0,
  });

  sleep(Math.random() * 3 + 2); // 2-5s think time

  // View product details
  const productId = Math.floor(Math.random() * 1000) + 1;
  const productRes = http.get(`${config.baseUrl}/api/products/${productId}`, {
    tags: { type: 'api', name: 'get_product' },
  });

  check(productRes, {
    'product status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1); // 1-3s
}
