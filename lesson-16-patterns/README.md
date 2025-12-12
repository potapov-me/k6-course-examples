# Урок 16: Продвинутые паттерны и чек-лист внедрения

Best practices, anti-patterns, и финальный чек-лист для production.

## Примеры

### 1. Cleanup pattern (`cleanup.js`)

Автоматическая очистка тестовых данных:

```bash
RUN_ID=test-$(date +%s) k6 run cleanup.js
```

**Паттерн:**
- `setup()`: подготовка окружения
- `default()`: тест с маркировкой данных
- `teardown()`: cleanup по test run ID

**Преимущества:**
- ✅ Нет "мусора" в БД после тестов
- ✅ Повторяемость (idempotent)
- ✅ Изоляция между запусками

### 2. Data Isolation (`data-isolation.js`)

4 стратегии изоляции данных:

```bash
k6 run data-isolation.js
```

**Стратегии:**
1. **Unique ID:** `order-${RUN_ID}-${VU}-${ITER}`
2. **Namespace:** Backend фильтрует по `X-Namespace`
3. **UUID:** `uuidv4()` для гарантированной уникальности
4. **Separate DB:** Каждый тест = своя БД

## Anti-Patterns (чего НЕ делать)

### ❌ Anti-Pattern 1: Hardcoded данные

```javascript
// ❌ Плохо
const BASE_URL = 'http://localhost:3000';
const USER_ID = 123;
```

```javascript
// ✅ Хорошо
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USER_ID = __ENV.USER_ID || (__VU % 100) + 1;
```

### ❌ Anti-Pattern 2: Нет cleanup

```javascript
// ❌ Плохо: оставляет мусор в БД
export default function() {
  http.post('/orders', {...});
}
```

```javascript
// ✅ Хорошо: cleanup в teardown
export function teardown() {
  http.del(`/admin/cleanup?runId=${RUN_ID}`);
}
```

### ❌ Anti-Pattern 3: Игнорирование ошибок

```javascript
// ❌ Плохо: не проверяет статус
const res = http.get('/api/products');
const products = res.json();
```

```javascript
// ✅ Хорошо: обработка ошибок
const res = http.get('/api/products');
if (res.status !== 200) {
  console.error(`Failed: ${res.status}`);
  return;
}
const products = res.json();
```

### ❌ Anti-Pattern 4: Нет sleep()

```javascript
// ❌ Плохо: нереалистичная нагрузка
export default function() {
  http.get('/api/products');
  http.post('/api/cart', {...});
}
// Result: 10k RPS вместо 100 RPS
```

```javascript
// ✅ Хорошо: реалистичный think time
export default function() {
  http.get('/api/products');
  sleep(Math.random() * 3 + 2); // 2-5s

  http.post('/api/cart', {...});
  sleep(1);
}
```

### ❌ Anti-Pattern 5: Тестирование production без согласования

```javascript
// ❌ ОЧЕНЬ ПЛОХО: DDoS на production
export const options = {
  vus: 10000,
  duration: '1h',
};
// Без согласования с DevOps/SRE
```

```javascript
// ✅ Хорошо: канарейка с feature flag
export const options = {
  vus: __ENV.CANARY_MODE ? 10 : 1000,
  duration: '5m',
};
// + Уведомление команды
// + Мониторинг
// + Kill switch готов
```

## Чек-лист внедрения k6

### Фаза 1: Подготовка (1-2 недели)

- [ ] **Определить цели**
  - [ ] SLA/SLO задокументированы
  - [ ] Типы тестов выбраны (smoke/load/stress)
  - [ ] Критерии Go/No-Go определены

- [ ] **Настроить окружение**
  - [ ] Тестовый стенд готов (staging/pre-prod)
  - [ ] k6 установлен (локально + CI/CD)
  - [ ] Тестовые данные подготовлены

- [ ] **Обучить команду**
  - [ ] 2-3 инженера прошли курс
  - [ ] Документация написана
  - [ ] Примеры тестов созданы

### Фаза 2: Первые тесты (2-3 недели)

- [ ] **Smoke тесты**
  - [ ] Написан базовый smoke-тест
  - [ ] Baseline метрики зафиксированы
  - [ ] Thresholds настроены

- [ ] **Load тесты**
  - [ ] Реалистичные user journeys
  - [ ] Traffic mix соответствует production
  - [ ] Custom метрики добавлены

- [ ] **Observability**
  - [ ] Grafana дашборды настроены
  - [ ] Prometheus интеграция работает
  - [ ] Alerts настроены

### Фаза 3: CI/CD интеграция (1-2 недели)

- [ ] **Автоматизация**
  - [ ] Smoke в каждом PR
  - [ ] Load перед релизом
  - [ ] Результаты в artifact storage

- [ ] **Критерии прохода**
  - [ ] Thresholds fail → pipeline fail
  - [ ] Baseline сравнение автоматическое
  - [ ] Отчеты генерируются

### Фаза 4: Production (ongoing)

- [ ] **Мониторинг**
  - [ ] Real-time метрики
  - [ ] Correlation с APM/logs
  - [ ] Incident response plan

- [ ] **Масштабирование**
  - [ ] k6-operator в K8s (если нужно)
  - [ ] Distributed execution настроен
  - [ ] Cost optimization

- [ ] **Continuous improvement**
  - [ ] Ежемесячный review результатов
  - [ ] Обновление SLO
  - [ ] Новые сценарии по мере роста

## Best Practices Summary

### 1. Стратегия

✅ Определите SLO перед написанием тестов
✅ Выберите правильный тип теста для каждой цели
✅ Baseline → изменения → сравнение

### 2. Данные

✅ Используйте SharedArray для больших datasets
✅ Изолируйте данные между запусками
✅ Cleanup в teardown()

### 3. Код

✅ Модульная структура
✅ Переиспользуемые утилиты (lib/)
✅ Environment variables для конфигурации

### 4. Метрики

✅ SLO-based thresholds
✅ Custom метрики для бизнес-KPI
✅ Tags для группировки

### 5. CI/CD

✅ Smoke в каждом PR (< 2 мин)
✅ Load перед релизом (5-10 мин)
✅ Fail fast при нарушении thresholds

### 6. Observability

✅ Prometheus + Grafana
✅ Correlation с APM (traces)
✅ Alerts на регрессии

### 7. Production

✅ Канарейка с малой нагрузкой
✅ Feature flags для kill switch
✅ Координация с SRE/DevOps

## Troubleshooting Guide

### Проблема: Тесты нестабильны (flaky)

**Причины:**
- Недетерминированные данные
- Race conditions в БД
- Network jitter

**Решения:**
- Используйте фиксированные seeds
- Изоляция данных (unique IDs)
- Увеличьте timeouts

### Проблема: Результаты не повторяются

**Причины:**
- Разное состояние БД
- Кеш влияет на результаты
- Think time слишком рандомный

**Решения:**
- Restore БД перед каждым тестом
- Warmup для прогрева кеша
- Фиксированный think time для baseline

### Проблема: Дорого масштабировать

**Причины:**
- Слишком много генераторов
- Неоптимальные ресурсы
- Долгие тесты

**Решения:**
- Spot instances в K8s
- Vertical scaling вместо horizontal
- Shorter smoke вместо long load

## Полезные ссылки

- [k6 Best Practices](https://k6.io/docs/testing-guides/test-builder/)
- [Performance Testing Guide](https://martinfowler.com/articles/practical-test-pyramid.html)
- [SLO Guide](https://sre.google/workbook/implementing-slos/)
