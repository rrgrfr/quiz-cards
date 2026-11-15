# Карточки — personal quiz

Персональное мобильное веб-приложение для обучения тестовыми карточками (iPhone, Safari 16.4+).
Спецификация и принятые решения — в [`docs/`](docs/), единственный источник решений — [`docs/DECISIONS.md`](docs/DECISIONS.md).
Анализ текущего состояния и спецификация v2 — [`docs/11_ANALYSIS_AND_IMPROVEMENTS.md`](docs/11_ANALYSIS_AND_IMPROVEMENTS.md), [`docs/12_SPEC_V2.md`](docs/12_SPEC_V2.md).

## Стек

TypeScript (strict) + Vite, нативный DOM, Vitest. Без UI-фреймворков и runtime-зависимостей.

## Команды

```bash
pnpm install      # установка зависимостей
pnpm dev          # локальная разработка
pnpm test         # unit/integration тесты
pnpm build        # сборка + проверка бюджета JS (≤120 КБ gzip)
pnpm preview      # предпросмотр собранной версии
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
```

## Структура

```
src/domain         правила домена
src/application    сценарии
src/infrastructure адаптеры (хранение, SW, сеть)
src/ui             экраны, компоненты, стили
src/shared         строки, конфиг
build              генерация Service Worker
scripts            проверка бюджета
tests              unit/integration
public             manifest, иконки
```

## Статус

Все этапы 1–6 реализованы: оболочка, тёмная тема, наборы и карточки, архив, локальное хранение
`pq.state.v1` с revision и защитой квоты, тестовый движок, статистика, импорт/экспорт и восстановление,
офлайн через Service Worker. Автоматическая часть стабилизации завершена: 106 тестов, офлайн-перезагрузка,
обновление SW, базовая доступность и бюджеты проверены. Реализована v2: ползунок количества вопросов
и большой набор-пример [`qa-core-239.json`](docs/templates/qa-core-239.json) на 239 карточек (импорт вручную).
Ручной чек-лист на iPhone и инициализация git — за пользователем.

## Шаблоны для импорта

- [deck-template.json](docs/templates/deck-template.json) — скелет набора.
- [example-deck.json](docs/templates/example-deck.json) — заполненный пример.
- [sql-day7-deck.json](docs/templates/sql-day7-deck.json) — 40 карточек по SQL (пример готового набора).
- [qa-core-239.json](docs/templates/qa-core-239.json) — большой пример на 239 карточек (DevTools, SQL, Postman, HTTP, Kafka, интеграции, Java, тест-дизайн).
- [AI_PROMPT.md](docs/templates/AI_PROMPT.md) — промпт для нейросети, чтобы разметить большой материал в JSON.

## Публикация

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) собирает проект и публикует `dist` на GitHub Pages при пуше в `main` (в настройках репозитория: Pages → Source: GitHub Actions).
