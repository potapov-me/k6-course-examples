# План реструктуризации репозитория

## Текущая структура → Новая структура (согласно урокам курса)

### Актуальные уроки курса:
- Урок 01: Что мы строим и для кого этот курс
- Урок 02: Методология: цели, SLA/SLO и выбор типов тестов
- Урок 03: Стенды, безопасность и базовая линия
- Урок 04: Тест-данные и параметризация
- Урок 05: Первый smoke-тест и минимальный набор опций
- Урок 06: Executors, scenarios и управление нагрузкой
- Урок 07: Реалистичные пользовательские потоки и миксы
- Урок 08: Продвинутая разработка сценариев на JavaScript в k6
- Урок 09: Метрики, checks и thresholds, привязанные к бизнес-целям
- Урок 10: Custom метрики и бизнес-KPI
- Урок 11: Интерпретация результатов и интеграция с наблюдаемостью
- Урок 12: CI/CD, критерии прохода и гейты перед релизом
- Урок 13: Chaos Engineering под нагрузкой
- Урок 14: WebSockets и gRPC в k6
- Урок 15: Масштабирование генераторов нагрузки и k6 в Kubernetes
- Урок 16: Продвинутые паттерны и чек-лист внедрения
- Урок 17: Финальный проект: внедрите k6 в свой проект

## Маппинг:

01-smoke-tests/         → lesson-05-first-smoke/
02-load-tests/          → lesson-06-executors/
03-scenarios/           → lesson-06-executors/ (merge)
04-traffic-modeling/    → lesson-07-traffic-modeling/
05-advanced-js/         → lesson-08-advanced-js/
06-metrics/             → lesson-09-metrics/ + lesson-10-custom-metrics/
07-observability/       → lesson-11-observability/
08-ci-cd/               → lesson-12-ci-cd/
09-websocket-grpc/      → lesson-14-protocols/
10-kubernetes/          → lesson-15-scaling/
11-patterns/            → lesson-16-patterns/

Новые папки:
- lesson-13-chaos/      (Chaos Engineering)
- lesson-17-final/      (Финальный проект)

Общие ресурсы:
- shopstack-app/        (Демо-приложение для всех уроков)
- fixtures/             (Тестовые данные)
- lib/                  (Переиспользуемые утилиты)
- scripts/              (Вспомогательные скрипты)
