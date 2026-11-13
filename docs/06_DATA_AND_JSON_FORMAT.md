# Модель данных и JSON-контракты

Версия 1.2 (2026-11-13). Контракты утверждены в `DECISIONS.md` (D-007, D-040…D-057). Открытых вопросов по схеме нет.

## 1. Сущности

### Deck
`id` UUID · `title` string 1–120 · `description?` string 0–200 · `isArchived` boolean · `createdAt` ISO 8601 UTC · `updatedAt` ISO 8601 UTC.
`updatedAt` обновляется при изменении набора или его карточек, но в UI v1 не используется (D-025).

### Card
`id` UUID · `deckId` UUID · `question` string 1–500 · `answers` массив ровно из 4 `AnswerOption` · `correctAnswerId` UUID · `explanation?` string 0–1000 · `isArchived` boolean · `createdAt` ISO 8601 UTC.

### AnswerOption
`id` UUID · `text` string 1–200.

### StudySession
`id` UUID · `deckId` UUID · `questionCount` integer · `correctCount` integer · `incorrectCount` integer · `startedAt` ISO 8601 UTC · `completedAt` ISO 8601 UTC · `attempts` массив `Attempt`.

### Attempt
`id` UUID · `cardId` UUID · `selectedAnswerId` UUID · `isCorrect` boolean · `answeredAt` ISO 8601 UTC.

### Settings
Зарезервированный пустой объект `{}`; в UI v1 не отображается (D-026).

## 2. Состояние приложения (`pq.state.v1`)

```json
{
  "schemaVersion": 1,
  "revision": 42,
  "decks": [],
  "cards": [],
  "sessions": [],
  "settings": {}
}
```

Правила:
- `schemaVersion` — 1; иное значение или повреждение → экран ошибки с выгрузкой и сбросом (D-030).
- `revision` — целое, увеличивается на 1 при каждой успешной записи (D-035).
- Запись выполняется одним `setItem`; ошибка записи не считается успехом (D-031).
- Перед записью проверяется объём: >4.5 МБ — отказ с сообщением (D-032).

## 3. Инварианты (проверяются при загрузке и восстановлении)

1. Все `id` уникальны в пределах состояния.
2. `Card.deckId` ссылается на существующий `Deck`; `Session.deckId` — на существующий `Deck`.
3. `Attempt.cardId` ссылается на существующую `Card`, эта карточка принадлежит набору сессии, а `selectedAnswerId` входит в `Card.answers`.
4. У `Card` ровно 4 варианта, `correctAnswerId` указывает на один из них.
5. Для завершённой сессии: `questionCount` = длина `attempts`, `correctCount` = число `isCorrect`, `incorrectCount` = `questionCount − correctCount`, `completedAt` ≥ `startedAt`.
6. Дубли `text` вариантов внутри карточки без учёта регистра недопустимы.
7. Тексты не пусты после trim и не превышают лимиты.

## 4. Формат импорта `personal-quiz-deck` v1

Один набор на файл; импорт добавляет набор к существующим данным (D-040, D-042).

```json
{
  "format": "personal-quiz-deck",
  "schemaVersion": 1,
  "deck": {
    "title": "HTTP",
    "description": "Основы HTTP",
    "cards": [
      {
        "question": "Что означает HTTP-статус 404?",
        "answers": [
          "Успешный запрос",
          "Ресурс не найден",
          "Ошибка авторизации",
          "Внутренняя ошибка сервера"
        ],
        "correctAnswerIndex": 1,
        "explanation": "Сервер не нашёл ресурс."
      }
    ]
  }
}
```

### Правила
- `format` = `personal-quiz-deck`, `schemaVersion` = 1; иначе отказ.
- `deck.title` обязателен, 1–120 после trim; `deck.description` необязателен, ≤200.
- `cards` — массив 1–1000 элементов; пустой массив отклоняется (D-047).
- Карточка: `question` 1–500; `answers` — ровно 4 непустых строки ≤200; `correctAnswerIndex` — целое 0–3; `explanation` — строка ≤1000, необязательна.
- Все тексты trim; пустые после trim — ошибка; дубли вариантов без учёта регистра — ошибка (D-045).
- Неизвестные поля игнорируются; типы известных полей проверяются строго (D-044).
- Лимит файла — 2 МБ; проверка до разбора (D-046).
- Импорт добавляет активный набор; ID генерируются (D-049). `correctAnswerIndex` превращается в `correctAnswerId` после генерации ID вариантов; порядок `answers` сохраняется.
- Совпадение названия с существующим набором — предупреждение и подтверждение; создаётся отдельный набор (D-043).

### Ошибки
Собираются все ошибки (до 20), каждая с номером карточки (1-based) и полем; файл отклоняется целиком, состояние не меняется (D-048).

```json
{ "code": "invalid-card", "card": 3, "field": "answers", "message": "Нужно ровно четыре непустых варианта" }
```

## 5. Формат резервной копии `personal-quiz-backup` v1

```json
{
  "format": "personal-quiz-backup",
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "2026-11-13T12:00:00.000Z",
  "data": {
    "decks": [],
    "cards": [],
    "sessions": [],
    "settings": {}
  }
}
```

Правила:
- Включаются активные и архивные наборы и карточки, завершённые сессии с попытками, `settings` (D-050, D-051).
- Незавершённые сессии не экспортируются.
- Имя файла: `quiz-backup-ГГГГ-ММ-ДД-ЧЧмм.json` (D-055).

### Валидация восстановления
1. Синтаксис JSON и наличие полей `format`, `schemaVersion`, `data`.
2. `format` = `personal-quiz-backup`, `schemaVersion` = 1 (D-054).
3. Уникальность ID, ссылочная целостность и инварианты раздела 3 (D-052).
4. Любая ошибка — отказ, текущие данные не меняются.
5. После успешной проверки — подтверждение с количеством наборов, карточек и сессий и замена всего состояния одним `setItem` (D-053).

## 6. Версии и совместимость
- Поддерживается только `schemaVersion` 1 для состояния, импорта и backup.
- Старые и новые версии отклоняются с сообщением; миграции появятся в следующей версии (D-054).
- Неизвестные поля в файлах игнорируются — задел на расширение без поломки старых файлов (D-044).
- Идентификаторы и времена не переиспользуются; ID генерируются UUID v4 (D-023), время — ISO 8601 UTC (D-024).

## 7. Соответствие требованиям
Импорт — FR-012…FR-014, FR-042, FR-043; backup — FR-015…FR-017; архивные состояния — FR-010, FR-011, FR-037; инварианты статистики — FR-026…FR-028.
