/**
 * Admin journey - управление инвентарем
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from '../config.js';
import { login } from '../../../lib/auth.js';

export function adminJourney() {
  // Login as admin
  const credentials = {
    email: 'test1@example.com', // Admin user
    password: 'Test123!',
  };

  const token = login(config.authUrl, credentials);
  if (!token) {
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(1);

  // Check inventory
  const productId = Math.floor(Math.random() * 100) + 1;
  const inventoryRes = http.get(
    `http://localhost:3003/inventory/check/${productId}`,
    { headers, tags: { type: 'inventory', name: 'check_stock' } }
  );

  check(inventoryRes, {
    'inventory check success': (r) => r.status === 200,
  });

  sleep(Math.random() * 5 + 3); // 3-8s admin think time
}
