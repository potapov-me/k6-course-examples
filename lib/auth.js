// Переиспользуемая функция авторизации
// Используется в сценариях для получения токена

import http from "k6/http";
import { check } from "k6";

/**
 * Авторизация пользователя и получение токена
 * @param {string} baseUrl - Base URL API
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {string|null} - JWT token или null при ошибке
 */
export function login(baseUrl, username, password) {
  const payload = JSON.stringify({
    username: username,
    password: password,
  });

  const res = http.post(`${baseUrl}/auth/login`, payload, {
    headers: {
      "Content-Type": "application/json",
    },
    tags: { endpoint: "login" },
  });

  const success = check(res, {
    "login status 200": (r) => r.status === 200,
    "has token": (r) => {
      const body = JSON.parse(r.body || "{}");
      return body.token !== undefined;
    },
  });

  if (!success) {
    console.error(`Login failed for ${username}: ${res.status}`);
    return null;
  }

  const body = JSON.parse(res.body);
  return body.token;
}

/**
 * Получает headers с авторизацией
 * @param {string} token - JWT token
 * @returns {object} - Headers object
 */
export function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
