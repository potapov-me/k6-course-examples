# Урок 14: WebSockets и gRPC в k6

Тестирование современных протоколов: WebSocket для real-time и gRPC для микросервисов.

## Примеры

### 1. WebSocket (`websocket.js`)

Тестирование WebSocket соединений:

```bash
# Запуск
WS_URL=ws://localhost:3000/ws k6 run websocket.js
```

**Что тестируется:**
- Установка WebSocket соединения
- Отправка/получение сообщений
- Latency сообщений
- Длительность соединения
- Reconnection logic

**Метрики:**
- `ws_messages_received` — количество полученных сообщений
- `ws_messages_sent` — количество отправленных
- `ws_message_latency` — задержка (ping-pong)
- `ws_connection_duration` — длительность соединения

**Use cases:**
- Real-time product updates
- Chat/messaging
- Live notifications
- Streaming data (prices, quotes)

### 2. gRPC (`grpc.js`)

Тестирование gRPC сервисов:

```bash
# Соберите k6 с xk6-grpc
go install go.k6.io/xk6/cmd/xk6@latest
xk6 build --with github.com/grafana/xk6-grpc

# Запуск
./k6 run grpc.js
```

**Что тестируется:**
- Unary calls (request-response)
- Server streaming
- Client streaming (TODO)
- Bidirectional streaming (TODO)

**Метрики:**
- `grpc_requests` — количество запросов
- `grpc_errors` — количество ошибок
- `grpc_duration` — время ответа

## WebSocket Patterns

### Pattern 1: Ping-Pong (health check)

```javascript
socket.on('open', () => {
  socket.setInterval(() => {
    socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }, 1000);
});

socket.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.type === 'pong') {
    const latency = Date.now() - msg.timestamp;
    messageLatency.add(latency);
  }
});
```

### Pattern 2: Subscribe to channels

```javascript
socket.on('open', () => {
  // Subscribe to multiple channels
  socket.send(JSON.stringify({
    type: 'subscribe',
    channels: ['product-updates', 'order-updates', 'inventory-alerts']
  }));
});

socket.on('message', (data) => {
  const msg = JSON.parse(data);

  switch (msg.channel) {
    case 'product-updates':
      // Handle product updates
      break;
    case 'order-updates':
      // Handle order updates
      break;
  }
});
```

### Pattern 3: Reconnection logic

```javascript
let reconnectAttempts = 0;
const maxReconnects = 3;

function connect() {
  ws.connect(url, params, function(socket) {
    socket.on('open', () => {
      reconnectAttempts = 0; // Reset on success
    });

    socket.on('close', () => {
      if (reconnectAttempts < maxReconnects) {
        reconnectAttempts++;
        setTimeout(() => connect(), 1000 * reconnectAttempts); // Backoff
      }
    });
  });
}
```

## gRPC Patterns

### Pattern 1: Unary Call (простой request-response)

```javascript
const response = client.invoke('service.Method/Action', {
  field1: 'value1',
  field2: 123,
});

check(response, {
  'status is OK': (r) => r.status === grpc.StatusOK,
  'has data': (r) => r.message !== undefined,
});
```

### Pattern 2: Server Streaming

```javascript
const stream = new grpc.Stream(client, 'service.Method/StreamAction');

stream.on('data', (chunk) => {
  console.log('Received chunk:', chunk);
});

stream.on('end', () => {
  console.log('Stream completed');
});

stream.on('error', (e) => {
  console.error('Stream error:', e);
});

stream.write({ query: 'electronics' });
```

### Pattern 3: Metadata (headers)

```javascript
const metadata = {
  'authorization': 'Bearer token123',
  'x-request-id': 'req-' + Date.now(),
};

const response = client.invoke('service.Method/Action', request, {
  metadata: metadata,
});
```

## Troubleshooting

### WebSocket: Connection refused

```bash
# Проверьте, что WebSocket сервер запущен
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:3000/ws
```

### WebSocket: Messages not received

Проверьте формат сообщений:
```javascript
socket.on('message', (data) => {
  console.log('Raw message:', data); // Debug
  try {
    const msg = JSON.parse(data);
    // Process message
  } catch (e) {
    console.error('Invalid JSON:', e.message);
  }
});
```

### gRPC: Module not found

Соберите k6 с xk6:
```bash
xk6 build --with github.com/grafana/xk6-grpc
./k6 version  # Должно показать xk6-grpc
```

### gRPC: Cannot load proto file

Проверьте путь к .proto файлу:
```javascript
// Относительно рабочей директории
client.load(['./proto'], 'service.proto');

// Или абсолютный путь
client.load(['/path/to/proto'], 'service.proto');
```

## Best Practices

### WebSocket

1. **Всегда закрывайте соединения**
   ```javascript
   socket.setTimeout(() => {
     socket.close();
   }, 30000); // Автоматическое закрытие
   ```

2. **Обрабатывайте ошибки**
   ```javascript
   socket.on('error', (e) => {
     console.error('WebSocket error:', e);
     errorCounter.add(1);
   });
   ```

3. **Используйте timeouts**
   ```javascript
   const params = {
     timeout: '10s', // Connection timeout
   };
   ```

### gRPC

1. **Переиспользуйте client**
   ```javascript
   const client = new grpc.Client();
   client.load(...); // Один раз в setup

   export default function() {
     client.connect(...);
     // Use client
     client.close();
   }
   ```

2. **Обрабатывайте все статусы**
   ```javascript
   switch (response.status) {
     case grpc.StatusOK:
       // Success
       break;
     case grpc.StatusNotFound:
       // Not found
       break;
     case grpc.StatusUnavailable:
       // Retry logic
       break;
   }
   ```

3. **Мониторьте latency**
   ```javascript
   const start = Date.now();
   const response = client.invoke(...);
   const duration = Date.now() - start;
   grpcDuration.add(duration);
   ```

## Полезные ссылки

- [k6 WebSocket Docs](https://k6.io/docs/javascript-api/k6-ws/)
- [xk6-grpc Extension](https://github.com/grafana/xk6-grpc)
- [gRPC Protocol](https://grpc.io/docs/)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
