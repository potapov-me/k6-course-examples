# Урок 08: Продвинутая разработка сценариев на JavaScript в k6

Модульность, архитектура кода тестов, работа с данными и отладка.

## Примеры

### 1. Модульная структура (`modular/`)

Организация кода теста в модули для переиспользования:

```bash
k6 run modular/main.js
```

**Структура:**
```
modular/
├── main.js           # Entry point
├── config.js         # Конфигурация
├── scenarios.js      # Определение scenarios
└── journeys/         # User journeys
    ├── reader.js
    ├── buyer.js
    └── admin.js
```

**Преимущества:**
- ✅ Переиспользование кода
- ✅ Легко поддерживать
- ✅ Читаемость
- ✅ Тестирование отдельных модулей

### 2. SharedArray для данных (`shared-data.js`)

Экономия RAM при использовании больших datasets:

```bash
k6 run shared-data.js
```

**Сравнение:**

| Подход | 100 VU × 10MB | RAM Usage |
|--------|---------------|-----------|
| Без SharedArray | 100 копий | 1000MB (1GB) |
| С SharedArray | 1 копия | 10MB |
| **Экономия** | | **99%** |

**Пример:**
```javascript
import { SharedArray } from 'k6/data';

// ✅ Одна копия в RAM
const users = new SharedArray('users', function() {
  return JSON.parse(open('../fixtures/users.json'));
});

export default function() {
  const user = users[__VU % users.length]; // Round-robin
  // ...
}
```

### 3. Отладка тестов (`debugging.js`)

Техники отладки k6 тестов:

```bash
# Обычный запуск
k6 run debugging.js

# С verbose логами
k6 run --verbose debugging.js

# С HTTP debug
k6 run --http-debug="full" debugging.js
```

**Техники:**
- `console.log()` для логирования
- `__VU` и `__ITER` для корреляции
- Custom метрики для трекинга проблем
- Try/catch для обработки ошибок
- Условные breakpoints

## Best Practices

### 1. Модульность

**❌ Плохо:**
```javascript
// Весь код в одном файле (500+ строк)
import http from 'k6/http';

export default function() {
  // 500 строк кода...
}
```

**✅ Хорошо:**
```javascript
// main.js
import { readerJourney } from './journeys/reader.js';
import { buyerJourney } from './journeys/buyer.js';

export const options = {
  scenarios: {
    reader: { exec: 'readerJourney', ... },
    buyer: { exec: 'buyerJourney', ... },
  },
};

export { readerJourney, buyerJourney };
```

### 2. Данные

**❌ Плохо:**
```javascript
// Каждый VU загружает свою копию
const users = JSON.parse(open('./users.json')); // 10MB × 100 VU = 1GB RAM
```

**✅ Хорошо:**
```javascript
// Одна копия для всех VU
import { SharedArray } from 'k6/data';
const users = new SharedArray('users', () => JSON.parse(open('./users.json'))); // 10MB
```

### 3. Конфигурация

**❌ Плохо:**
```javascript
// Hardcoded values
const BASE_URL = 'http://localhost:3000';
```

**✅ Хорошо:**
```javascript
// Используйте переменные окружения
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
```

### 4. Именование

**❌ Плохо:**
```javascript
const r = http.get(url);
const d = r.json('data');
```

**✅ Хорошо:**
```javascript
const productsRes = http.get(url);
const products = productsRes.json('data');
```

### 5. Обработка ошибок

**❌ Плохо:**
```javascript
const data = res.json('data'); // Может упасть, если не JSON
```

**✅ Хорошо:**
```javascript
let data;
try {
  data = res.json('data');
} catch (e) {
  console.error('Failed to parse JSON:', e.message);
  return;
}
```

## Запуск примеров

```bash
# Модульная структура
cd lesson-08-advanced-js
k6 run modular/main.js

# SharedArray
k6 run shared-data.js

# Отладка
k6 run debugging.js

# С переменными окружения
BASE_URL=https://staging.example.com k6 run modular/main.js
```

## Troubleshooting

### Ошибка "cannot find module"

Проверьте относительные пути:
```javascript
// ❌ Неправильно
import { login } from "lib/auth.js";

// ✅ Правильно
import { login } from "../../../lib/auth.js";
```

### SharedArray не экономит RAM

Убедитесь, что используете function, а не arrow function:
```javascript
// ❌ Не работает
const users = new SharedArray('users', () => JSON.parse(open('./users.json')));

// ✅ Работает
const users = new SharedArray('users', function() {
  return JSON.parse(open('./users.json'));
});
```

### Console.log не выводится

Запустите с `--verbose`:
```bash
k6 run --verbose debugging.js
```

## Полезные ссылки

- [k6 Modules](https://k6.io/docs/using-k6/modules/)
- [SharedArray Docs](https://k6.io/docs/javascript-api/k6-data/sharedarray/)
- [Debugging k6](https://k6.io/docs/using-k6/debugging/)
