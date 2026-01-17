# Тестирование LectureEnvironmentManager

Документация по тестированию сервиса управления окружением лекций.

## Обзор

`LectureEnvironmentManager` отвечает за:
- Инициализацию Node.js окружения в директории лекции
- Установку зависимостей (slidev)
- Управление dev server для разработки
- Сборку статических файлов презентации

## Тестовые сценарии

### 1. Инициализация окружения

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should create manager with correct configuration | Проверка создания менеджера с корректной конфигурацией | Все пути установлены правильно |
| should return isReady = false initially | Проверка начального статуса | status = NOT_INITIALIZED |
| should initialize environment successfully | Инициализация окружения | status = READY, package.json создан |
| should create package.json with slidev dependency | Проверка структуры package.json | @slidev/core в devDependencies |
| should return error when lecture directory does not exist | Обработка отсутствующей директории | Ошибка, status = ERROR |
| should return error when slides.md does not exist | Обработка отсутствующего slides.md | Ошибка, status = ERROR |

### 2. Установка зависимостей

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should fail if environment not initialized | Проверка precondition | Ошибка если не инициализировано |
| should return result structure after initialization | Структура результата | Все обязательные поля присутствуют |

### 3. Dev Server

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should fail if environment not initialized | Проверка precondition | Ошибка если не инициализировано |
| should return result with URL structure after initialization | Формирование URL | URL содержит host и port |
| should use configured port in URL | Проверка порта | URL содержит правильный порт |
| should handle running server gracefully | Остановка сервера | Сервер останавливается без ошибок |
| should return false if no server is running | Состояние "нет сервера" | Возвращает false |
| should return correct status after start attempt | Статус после запуска | Корректный boolean |

### 4. Build

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should fail if environment not initialized | Проверка precondition | Ошибка если не инициализировано |
| should return result with messages after initialization | Структура результата | messages содержит вывод |
| should report output path when build succeeds | Путь к выводу | outputPath содержит "dist" |

### 5. Процессы

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should return empty array initially | Начальное состояние | Пустой массив |
| should return processes array after start attempt | Процессы после запуска | Массив процессов |
| should complete without error | Остановка всех процессов | Без ошибок |

### 6. package.json Scripts

| Тест | Описание | Ожидаемый результат |
|------|----------|---------------------|
| should have correct scripts for dev server | Скрипт dev | Содержит "slidev" |
| should have correct scripts for build | Скрипт build | Содержит "slidev build" |
| should have correct scripts for export | Скрипт export | Содержит "slidev export" |

## Запуск тестов

```bash
# Все тесты
pnpm test:unit

# Только LectureEnvironmentManager
npx mocha out/test/suite/lectureEnvironmentManager.test.js --reporter spec --timeout 60000
```

## Ожидаемое время выполнения

~30 секунд (включая npm install)

## Зависимости

- Node.js >= 18
- npm или pnpm
- slidev (устанавливается автоматически)

## Edge Cases

1. **Отсутствующие node_modules** - автоматическая установка при запуске
2. **Процесс уже запущен** - существующий процесс останавливается перед запуском нового
3. **Windows vs Unix** - разные команды для завершения процессов
4. **Timeout сборки** - 5 минут максимум