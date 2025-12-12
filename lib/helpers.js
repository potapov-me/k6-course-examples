// Вспомогательные функции для тестов

/**
 * Генерирует уникальный ID для тестовых данных
 * @returns {string} - Unique ID
 */
export function generateUniqueId() {
  const runId = __ENV.RUN_ID || Date.now();
  return `${runId}-${__VU}-${__ITER}`;
}

/**
 * Случайный элемент из массива
 * @param {Array} arr - Array
 * @returns {*} - Random element
 */
export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Случайное число в диапазоне
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} - Random number
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Think time с вариацией
 * @param {number} base - Base time in seconds
 * @param {number} variation - Variation in seconds (default: 1)
 * @returns {number} - Time to sleep
 */
export function thinkTime(base = 1, variation = 1) {
  return base + Math.random() * variation;
}
