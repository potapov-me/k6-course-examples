/**
 * WebSocket тестирование с k6
 * Урок 14: WebSockets и gRPC в k6
 */

import { check } from 'k6';
import ws from 'k6/ws';
import { Counter, Trend } from 'k6/metrics';

const WS_URL = __ENV.WS_URL || 'ws://localhost:3000/ws';

// Custom метрики
const messagesReceived = new Counter('ws_messages_received');
const messagesSent = new Counter('ws_messages_sent');
const connectionDuration = new Trend('ws_connection_duration');
const messageLatency = new Trend('ws_message_latency');

export const options = {
  vus: 50,
  duration: '2m',
  thresholds: {
    ws_messages_received: ['count>100'],      // Минимум 100 сообщений получено
    ws_message_latency: ['p(95)<100'],        // 95% < 100ms latency
    ws_connection_duration: ['avg>10000'],    // Средняя длительность > 10s
  },
};

export default function() {
  const url = WS_URL;
  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.WS_TOKEN || 'test-token'}`,
    },
    tags: { protocol: 'websocket' },
  };

  const res = ws.connect(url, params, function(socket) {
    socket.on('open', () => {
      console.log(`[VU ${__VU}] WebSocket connected`);

      // Отправка сообщений
      socket.setInterval(() => {
        const message = JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
          vu: __VU,
        });

        socket.send(message);
        messagesSent.add(1);
      }, 1000); // Каждую секунду

      // Подписка на обновления
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'product-updates',
      }));

      // Автоматическое закрытие через 30 секунд
      socket.setTimeout(() => {
        console.log(`[VU ${__VU}] Closing WebSocket after 30s`);
        socket.close();
      }, 30000);
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceived.add(1);

        // Измерение latency (если есть timestamp)
        if (message.timestamp) {
          const latency = Date.now() - message.timestamp;
          messageLatency.add(latency);
        }

        check(message, {
          'message has type': (m) => m.type !== undefined,
          'message is valid JSON': () => true,
        });

        // Обработка разных типов сообщений
        switch (message.type) {
          case 'pong':
            // Response to ping
            break;
          case 'product-update':
            console.log(`[VU ${__VU}] Product update: ${message.productId}`);
            break;
          case 'error':
            console.error(`[VU ${__VU}] Error: ${message.error}`);
            break;
        }
      } catch (e) {
        console.error(`[VU ${__VU}] Failed to parse message: ${e.message}`);
      }
    });

    socket.on('close', () => {
      console.log(`[VU ${__VU}] WebSocket disconnected`);
    });

    socket.on('error', (e) => {
      console.error(`[VU ${__VU}] WebSocket error:`, e);
    });
  });

  check(res, {
    'WebSocket status is 101': (r) => r && r.status === 101,
  });

  if (res && res.timings) {
    connectionDuration.add(res.timings.duration);
  }
}

/**
 * Примеры WebSocket сценариев:
 *
 * 1. Real-time updates (product inventory)
 * 2. Chat/messaging
 * 3. Live notifications
 * 4. Streaming data (prices, quotes)
 * 5. Multiplayer games
 *
 * Запуск:
 * WS_URL=ws://localhost:3000/ws k6 run websocket.js
 *
 * Метрики:
 * - ws_messages_received: количество полученных сообщений
 * - ws_messages_sent: количество отправленных сообщений
 * - ws_message_latency: задержка сообщений
 * - ws_connection_duration: длительность соединения
 */
