/**
 * Определение scenarios
 */

export const scenarios = {
  reader: {
    executor: 'constant-vus',
    vus: 70,
    duration: '5m',
    exec: 'readerJourney',
    tags: { type: 'reader' },
  },

  buyer: {
    executor: 'constant-vus',
    vus: 25,
    duration: '5m',
    exec: 'buyerJourney',
    tags: { type: 'buyer' },
  },

  admin: {
    executor: 'constant-vus',
    vus: 5,
    duration: '5m',
    exec: 'adminJourney',
    tags: { type: 'admin' },
  },
};
