/**
 * gRPC тестирование с k6
 * Урок 14: WebSockets и gRPC в k6
 *
 * Требования:
 * 1. Установите xk6: go install go.k6.io/xk6/cmd/xk6@latest
 * 2. Соберите k6 с gRPC: xk6 build --with github.com/grafana/xk6-grpc
 * 3. Используйте собранный бинарник: ./k6 run grpc.js
 */

import grpc from 'k6/net/grpc';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const GRPC_HOST = __ENV.GRPC_HOST || 'localhost:50051';

// Custom метрики
const grpcRequests = new Counter('grpc_requests');
const grpcErrors = new Counter('grpc_errors');
const grpcDuration = new Trend('grpc_duration');

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    grpc_duration: ['p(95)<200'],           // 95% < 200ms
    grpc_errors: ['count<10'],              // Макс 10 ошибок
  },
};

const client = new grpc.Client();
client.load(['../proto'], 'product_service.proto');

export default function() {
  // Подключение к gRPC серверу
  client.connect(GRPC_HOST, {
    plaintext: true, // Без TLS (для dev)
    timeout: '10s',
  });

  // 1. Unary call: GetProduct
  try {
    const startTime = new Date();

    const response = client.invoke('product.ProductService/GetProduct', {
      product_id: Math.floor(Math.random() * 1000) + 1,
    });

    const duration = new Date() - startTime;
    grpcDuration.add(duration);
    grpcRequests.add(1);

    check(response, {
      'status is OK': (r) => r && r.status === grpc.StatusOK,
      'has product data': (r) => r && r.message && r.message.name !== undefined,
    });

    if (response.status !== grpc.StatusOK) {
      console.error(`gRPC error: ${response.status} - ${response.error}`);
      grpcErrors.add(1);
    }
  } catch (e) {
    console.error('gRPC request failed:', e.message);
    grpcErrors.add(1);
  }

  sleep(1);

  // 2. Server streaming: ListProducts
  try {
    const stream = new grpc.Stream(client, 'product.ProductService/ListProducts');

    stream.on('data', (product) => {
      console.log(`Received product: ${product.name}`);
    });

    stream.on('end', () => {
      console.log('Stream ended');
    });

    stream.on('error', (e) => {
      console.error('Stream error:', e.message);
      grpcErrors.add(1);
    });

    // Запускаем stream
    stream.write({ category: 'Electronics' });
  } catch (e) {
    console.error('gRPC stream failed:', e.message);
  }

  // Закрываем соединение
  client.close();
  sleep(1);
}

/**
 * Protobuf definition (product_service.proto):
 *
 * syntax = "proto3";
 * package product;
 *
 * service ProductService {
 *   rpc GetProduct (GetProductRequest) returns (Product);
 *   rpc ListProducts (ListProductsRequest) returns (stream Product);
 *   rpc CreateProduct (CreateProductRequest) returns (Product);
 * }
 *
 * message GetProductRequest {
 *   int32 product_id = 1;
 * }
 *
 * message Product {
 *   int32 id = 1;
 *   string name = 2;
 *   double price = 3;
 *   string category = 4;
 * }
 *
 * Запуск:
 * 1. Соберите k6 с xk6-grpc:
 *    xk6 build --with github.com/grafana/xk6-grpc
 *
 * 2. Запустите тест:
 *    ./k6 run grpc.js
 *
 * Альтернатива (без xk6):
 * Используйте k6/http для gRPC-web (HTTP/2):
 * - Content-Type: application/grpc
 * - Binary protobuf payload
 */
