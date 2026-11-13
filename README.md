# Карточки — personal quiz

Персональное мобильное веб-приложение для обучения тестовыми карточками (iPhone, Safari 16.4+).
Спецификация и принятые решения — в [`docs/`](docs/), единственный источник решений — [`docs/DECISIONS.md`](docs/DECISIONS.md).

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
офлайн через Service Worker. Автоматическая часть стабилизации завершена: 97 тестов, офлайн-перезагрузка,
обновление SW, базовая доступность и бюджеты проверены. Ручной чек-лист на iPhone и инициализация git —
за пользователем.

## Публикация

Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) собирает проект и публикует `dist` на GitHub Pages при пуше в `main` (в настройках репозитория: Pages → Source: GitHub Actions).
