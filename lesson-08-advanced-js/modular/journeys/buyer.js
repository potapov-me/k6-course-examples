/**
 * Buyer journey - покупка товаров
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from '../config.js';
import { login } from '../../../lib/auth.js';

export function buyerJourney() {
  // Login
  const userNum = (__VU % 100) + 1;
  const credentials = {
    email: `test${userNum}@example.com`,
    password: 'Test123!',
  };

  const token = login(config.authUrl, credentials);
  if (!token) {
    return; // Failed to login
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  sleep(1);

  // Add to cart
  const addToCartRes = http.post(
    `${config.baseUrl}/api/cart`,
    JSON.stringify({
      productId: Math.floor(Math.random() * 1000) + 1,
      quantity: Math.floor(Math.random() * 3) + 1,
    }),
    { headers, tags: { type: 'api', name: 'add_to_cart' } }
  );

  check(addToCartRes, {
    'add to cart success': (r) => r.status === 200,
  });

  sleep(Math.random() * 2 + 1);

  // Checkout (50% complete checkout)
  if (Math.random() < 0.5) {
    const checkoutRes = http.post(
      `${config.baseUrl}/api/orders/checkout`,
      JSON.stringify({ paymentMethod: 'card' }),
      { headers, tags: { type: 'api', name: 'checkout' } }
    );

    check(checkoutRes, {
      'checkout success': (r) => r.status === 201,
    });
  }

  sleep(1);
}
