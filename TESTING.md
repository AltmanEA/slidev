# Тестирование расширения Slidev Course Manager

Данное расширение VSCode настроено для проведения различных типов тестирования согласно [официальным рекомендациям Microsoft](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

## Структура тестирования

### Типы тестов

1. **Unit-тесты** - быстрые тесты, проверяющие логику без запуска VSCode
2. **Integration-тесты** - полноценные тесты, запускающие VSCode в тестовой среде

### Файлы тестирования

```
src/test/
├── runTest.ts           # Основной скрипт для запуска integration-тестов
├── unit-runner.ts       # Скрипт для запуска unit-тестов
└── suite/
    ├── index.ts         # Test runner для integration-тестов
    ├── extension.test.ts # Integration-тесты расширения
    └── unit.test.ts     # Unit-тесты
```

## Команды для запуска тестов

### Unit-тесты (рекомендуется)
```bash
# Запуск unit-тестов
pnpm run test:unit

# Или через npx mocha
npx mocha out/test/suite/unit.test.js --reporter spec
```

### Integration-тесты
```bash
# Запуск всех тестов (unit + integration)
pnpm test

# Только integration-тесты
pnpm run test:integration
```

## Что тестируется

### Unit-тесты
- ✅ Базовая функциональность модулей
- ✅ Структуры данных курса и лекций
- ✅ Валидация входных данных
- ✅ Функции обработки путей

### Integration-тесты
- ✅ Активация расширения
- ✅ Регистрация команд VSCode
- ✅ Создание Tree View
- ✅ Доступность конфигурации

## Отладка тестов

### В VSCode
1. Откройте файл `extension.test.ts` или `unit.test.ts`
2. Нажмите F5 или используйте Debug > Start Debugging
3. Выберите конфигурацию "Extension Tests"

### В командной строке
```bash
# Запуск с подробным выводом
npx mocha out/test/suite/unit.test.js --reporter spec --timeout 10000

# Запуск с отладкой Node.js
node --inspect-brk ./node_modules/.bin/mocha out/test/suite/unit.test.js
```

## Настройка тестовой среды

### Автоматическая настройка
При первом запуске тестов автоматически:
1. Скачивается VSCode для тестирования
2. Создается тестовая папка `.vscode-test/`
3. Настраивается изолированная среда

### Ручная очистка тестовой среды
```bash
# Удаление тестовых данных
rm -rf .vscode-test/

# Полная переустановка
pnpm install
pnpm run compile
```

## Конфигурация

### package.json
```json
{
  "scripts": {
    "test": "node ./out/test/runTest.js",
    "test:unit": "tsc -p ./ && node ./out/test/unit-runner.js",
    "test:integration": "node ./out/test/runTest.js"
  }
}
```

### .vscode/launch.json
Конфигурация для отладки тестов в VSCode уже настроена.

## Рекомендации по разработке

1. **Приоритет unit-тестов**: Сначала создавайте unit-тесты для быстрой проверки логики
2. **Integration-тесты**: Добавляйте для критически важной функциональности
3. **Непрерывное тестирование**: Запускайте `pnpm test:unit` перед каждым коммитом
4. **CI/CD**: Используйте unit-тесты в pipeline для быстрой обратной связи

## Устранение неполадок

### Частые проблемы

1. **Ошибка "bad option" при запуске VSCode**
   - Проблема: Несовместимость аргументов командной строки в Windows
   - Решение: Используйте unit-тесты для основной разработки

2. **ESLint ошибки**
   - Решение: Запустите `pnpm run compile` перед тестами
   - Временное решение: Пропустите lint `npx mocha out/test/suite/unit.test.js`

3. **Модуль не найден**
   - Решение: Пересоберите проект `pnpm run compile`

### Поддержка
При возникновении проблем с тестированием:
1. Проверьте версии зависимостей в package.json
2. Очистите node_modules и переустановите: `rm -rf node_modules && pnpm install`
3. Убедитесь, что TypeScript компилируется без ошибок