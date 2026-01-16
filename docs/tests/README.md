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

- **Общее количество тестов**: 31
- **Покрытие**: Все основные методы LectureDiscoveryService
- **Типы тестов**: Unit-тесты, интеграционные тесты, тесты обработки ошибок

## Структура тестов

Тесты расположены в `src/test/suite/`:
- `lectureDiscovery.test.ts` - тесты для LectureDiscoveryService
- `unit.test.js` - базовые unit-тесты
- `utilities.test.js` - тесты утилитарных функций

## Тестовая инфраструктура

- **Тестовый фреймворк**: Mocha
- **Ассерты**: Node.js assert
- **Тестовые данные**: Реальные файлы в `test-lectures/`
- **Покрытие**: 100% основной функциональности LectureDiscoveryService