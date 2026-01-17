# Документация по тестированию

Эта папка содержит документацию, связанную с тестированием проекта Slidev Course Manager.

## Содержимое

### [TESTING_LECTURE_DISCOVERY.md](./TESTING_LECTURE_DISCOVERY.md)
Комплексная документация по тестированию сервиса `LectureDiscoveryService`, включающая:
- Структуру тестов
- Покрытые сценарии
- Тестовые данные
- Инструкции по запуску тестов
- Результаты тестирования

### [TESTING_FRONTMATTER_PARSER.md](./TESTING_FRONTMATTER_PARSER.md)
Документация по тестированию сервиса `FrontmatterParser`, включающая:
- Обзор сервиса и его методов
- Тестовые сценарии (базовый парсинг, валидация, граничные случаи)
- Коды ошибок валидации
- Соответствие спецификации SPEC.md

## Запуск тестов

```bash
# Компиляция проекта
pnpm run compile

# Запуск всех unit-тестов
pnpm run test:unit

# Запуск только тестов lectureDiscovery
npx mocha out/test/suite/lectureDiscovery.test.js --reporter spec
```

## Статистика тестирования

### LectureDiscoveryService
- **Количество тестов**: 31
- **Покрытие**: Все основные методы
- **Типы тестов**: Unit-тесты, интеграционные тесты, тесты обработки ошибок

### FrontmatterParser
- **Количество тестов**: 36
- **Покрытие**: Все методы (parse, isValid, extractMetadata, hasTitle)
- **Типы тестов**: Базовый парсинг, валидация, граничные случаи, интеграция

## Структура тестов

Тесты расположены в `src/test/suite/`:
- `lectureDiscovery.test.ts` - тесты для LectureDiscoveryService
- `frontmatterParser.test.ts` - тесты для FrontmatterParser
- `unit.test.js` - базовые unit-тесты
- `utilities.test.js` - тесты утилитарных функций

## Тестовая инфраструктура

- **Тестовый фреймворк**: Mocha
- **Ассерты**: Node.js assert
- **Тестовые данные**: Реальные файлы в `test-lectures/`
- **Покрытие**: 100% основной функциональности сервисов