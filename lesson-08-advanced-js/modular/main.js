/**
 * Модульная структура k6 теста
 * Урок 08: Продвинутая разработка сценариев на JavaScript в k6
 */

import { scenarios } from './scenarios.js';
import { config } from './config.js';

export const options = {
  scenarios: scenarios,
  thresholds: config.thresholds,
};

export { readerJourney } from './journeys/reader.js';
export { buyerJourney } from './journeys/buyer.js';
export { adminJourney } from './journeys/admin.js';
