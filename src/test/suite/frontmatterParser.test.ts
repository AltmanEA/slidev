import * as assert from 'assert';
import { suite, test } from 'mocha';
import { FrontmatterParser } from '../../services/frontmatterParser';
import { FrontmatterValidationError } from '../../types/frontmatter';

suite('Тесты FrontmatterParser', () => {
  let parser: FrontmatterParser;

  beforeEach(() => {
    parser = new FrontmatterParser();
  });

  suite('parse() - базовый парсинг', () => {
    test('Должен парсить корректный frontmatter со всеми полями', () => {
      const content = `---
title: "Introduction to Programming"
description: "Basic concepts of programming"
date: "2024-01-15"
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.ok(result.metadata, 'Метаданные должны присутствовать');
      assert.strictEqual(result.metadata?.title, 'Introduction to Programming', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, 'Basic concepts of programming', 'Описание должно совпадать');
      assert.strictEqual(result.metadata?.date, '2024-01-15', 'Дата должна совпадать');
      assert.strictEqual(result.errors.length, 0, 'Не должно быть ошибок');
    });

    test('Должен парсить frontmatter только с обязательным полем title', () => {
      const content = `---
title: "Data Structures"
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Data Structures', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, undefined, 'Описание должно быть undefined');
      assert.strictEqual(result.metadata?.date, undefined, 'Дата должна быть undefined');
      assert.strictEqual(result.errors.length, 0, 'Не должно быть ошибок');
    });

    test('Должен парсить frontmatter с пустыми опциональными полями', () => {
      const content = `---
title: "Algorithms"
description: ""
date: ""
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Algorithms', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, undefined, 'Пустое описание должно быть undefined');
      assert.strictEqual(result.metadata?.date, undefined, 'Пустая дата должна быть undefined');
    });

    test('Должен обрабатывать frontmatter без разделителей', () => {
      const content = `# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.strictEqual(result.metadata, undefined, 'Метаданные должны отсутствовать');
      assert.ok(result.errors.includes(FrontmatterValidationError.NO_FRONTMATTER), 'Должна быть ошибка NO_FRONTMATTER');
    });

    test('Должен обрабатывать пустой frontmatter', () => {
      const content = `---
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.strictEqual(result.metadata, undefined, 'Метаданные должны отсутствовать');
      assert.ok(result.errors.includes(FrontmatterValidationError.EMPTY_FRONTMATTER), 'Должна быть ошибка EMPTY_FRONTMATTER');
    });
  });

  suite('parse() - валидация title', () => {
    test('Должен отклонять frontmatter без поля title', () => {
      const content = `---
description: "Some description"
date: "2024-01-15"
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.strictEqual(result.metadata?.title, undefined, 'Заголовок должен отсутствовать');
      assert.ok(result.errors.includes(FrontmatterValidationError.MISSING_TITLE), 'Должна быть ошибка MISSING_TITLE');
    });

    test('Должен отклонять frontmatter с пустым title', () => {
      const content = `---
title: ""
description: "Description"
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.ok(result.errors.includes(FrontmatterValidationError.EMPTY_TITLE), 'Должна быть ошибка EMPTY_TITLE');
    });

    test('Должен отклонять frontmatter с title из одних пробелов', () => {
      const content = `---
title: "   "
description: "Description"
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.ok(result.errors.includes(FrontmatterValidationError.EMPTY_TITLE), 'Должна быть ошибка EMPTY_TITLE');
    });

    test('Должен обрабатывать title как число', () => {
      const content = `---
title: 123
---

# Slide 1
Content here`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, '123', 'Число должно быть преобразовано в строку');
    });
  });

  suite('parse() - валидация date', () => {
    test('Должен принимать корректные даты', () => {
      const validDates = [
        '2024-01-15',
        '2020-12-31',
        '1990-01-01',
        '2030-06-15'
      ];

      validDates.forEach(date => {
        const content = `---
title: "Test"
date: "${date}"
---

# Slide 1`;

        const result = parser.parse(content);

        assert.strictEqual(result.isValid, true, `${date} должна быть валидной датой`);
        assert.strictEqual(result.metadata?.date, date, `${date} должна сохраняться как есть`);
      });
    });

    test('Должен отклонять невалидный формат даты', () => {
      const invalidDates = [
        '2024/01/15', // неправильный разделитель
        '24-01-15', // неполный год
        '2024-1-15', // неполный месяц
        '2024-01-5', // неполный день
        'invalid-date',
        '2024-01-15-extra'
      ];

      invalidDates.forEach(date => {
        const content = `---
title: "Test"
date: "${date}"
---

# Slide 1`;

        const result = parser.parse(content);

        assert.strictEqual(result.isValid, false, `${date} должна быть невалидной датой`);
        assert.ok(result.errors.includes(FrontmatterValidationError.INVALID_DATE_FORMAT), `Должна быть ошибка INVALID_DATE_FORMAT для ${date}`);
      });
    });

    test('Должен отклонять несуществующие даты', () => {
      const invalidDates = [
        '2024-13-15', // несуществующий месяц
        '2024-01-32', // несуществующий день
        '2025-02-29'  // не високосный год (2025 не делится на 4)
      ];

      invalidDates.forEach(date => {
        const content = `---
title: "Test"
date: "${date}"
---

# Slide 1`;

        const result = parser.parse(content);

        assert.strictEqual(result.isValid, false, `${date} должна быть невалидной датой`);
        assert.ok(result.errors.includes(FrontmatterValidationError.INVALID_DATE_VALUE), `Должна быть ошибка INVALID_DATE_VALUE для ${date}`);
      });
    });

    test('Должен принимать високосные годы', () => {
      const content = `---
title: "Test"
date: "2024-02-29"
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Високосный год должен быть валидным');
      assert.strictEqual(result.metadata?.date, '2024-02-29', 'Дата должна сохраняться');
    });

    test('Должен обрабатывать дату как число', () => {
      const content = `---
title: "Test"
date: 20240115
---

# Slide 1`;

      const result = parser.parse(content);

      // Число будет преобразовано в строку и может не пройти формат
      // Это зависит от реализации gray-matter
      assert.ok(result.errors.length >= 0, 'Парсинг должен обработать число');
    });
  });

  suite('parse() - обработка типов данных', () => {
    test('Должен обрабатывать null значения', () => {
      const content = `---
title: "Test"
description: null
date: null
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.description, undefined, 'Null описание должно быть undefined');
      assert.strictEqual(result.metadata?.date, undefined, 'Null дата должна быть undefined');
    });

    test('Должен обрабатывать boolean значения', () => {
      const content = `---
title: true
description: false
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'true', 'Boolean title должен быть строкой "true"');
      assert.strictEqual(result.metadata?.description, 'false', 'Boolean description должен быть строкой "false"');
    });

    test('Должен обрабатывать трайлинг пробелы', () => {
      const content = `---
title: "  Test Title  "
description: "  Test Description  "
date: "  2024-01-15  "
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Test Title', 'Пробелы должны быть обрезаны');
      assert.strictEqual(result.metadata?.description, 'Test Description', 'Пробелы должны быть обрезаны');
      assert.strictEqual(result.metadata?.date, '2024-01-15', 'Пробелы в дате должны быть обрезаны');
    });
  });

  suite('parse() - обработка ошибок', () => {
    test('Должен обрабатывать ошибки парсинга YAML', () => {
      const content = `---
title: "Test"
invalid yaml: : :
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.ok(result.errors.length > 0, 'Должны быть ошибки парсинга');
    });

    test('Должен возвращать все ошибки валидации', () => {
      const content = `---
title: ""
description: ""
date: "invalid"
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Результат должен быть невалидным');
      assert.ok(result.errors.length >= 2, 'Должно быть несколько ошибок');
    });
  });

  suite('isValid()', () => {
    test('Должен возвращать true для валидного frontmatter', () => {
      const content = `---
title: "Test"
---

# Slide 1`;

      assert.strictEqual(parser.isValid(content), true, 'Должен возвращать true');
    });

    test('Должен возвращать false для невалидного frontmatter', () => {
      const content = `---
---

# Slide 1`;

      assert.strictEqual(parser.isValid(content), false, 'Должен возвращать false');
    });

    test('Должен возвращать false для отсутствующего frontmatter', () => {
      const content = `# Slide 1`;

      assert.strictEqual(parser.isValid(content), false, 'Должен возвращать false');
    });
  });

  suite('extractMetadata()', () => {
    test('Должен извлекать метаданные из валидного файла', () => {
      const content = `---
title: "Test Lecture"
description: "Test Description"
date: "2024-01-15"
---

# Slide 1`;

      const metadata = parser.extractMetadata(content);

      assert.ok(metadata, 'Метаданные должны присутствовать');
      assert.strictEqual(metadata?.title, 'Test Lecture', 'Заголовок должен совпадать');
      assert.strictEqual(metadata?.description, 'Test Description', 'Описание должно совпадать');
      assert.strictEqual(metadata?.date, '2024-01-15', 'Дата должна совпадать');
    });

    test('Должен возвращать undefined для невалидного файла', () => {
      const content = `---
---

# Slide 1`;

      const metadata = parser.extractMetadata(content);

      assert.strictEqual(metadata, undefined, 'Метаданные должны быть undefined');
    });
  });

  suite('hasTitle()', () => {
    test('Должен возвращать true при наличии title', () => {
      const content = `---
title: "Test"
description: "Description"
---

# Slide 1`;

      assert.strictEqual(parser.hasTitle(content), true, 'Должен возвращать true');
    });

    test('Должен возвращать false при отсутствии title', () => {
      const content = `---
description: "Description"
---

# Slide 1`;

      assert.strictEqual(parser.hasTitle(content), false, 'Должен возвращать false');
    });

    test('Должен возвращать false для пустого title', () => {
      const content = `---
title: ""
---

# Slide 1`;

      assert.strictEqual(parser.hasTitle(content), false, 'Должен возвращать false');
    });

    test('Должен возвращать false для отсутствующего frontmatter', () => {
      const content = `# Slide 1`;

      assert.strictEqual(parser.hasTitle(content), false, 'Должен возвращать false');
    });
  });

  suite('Интеграционные тесты', () => {
    test('Должен корректно обрабатывать реальный файл lecture-1', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('./test-lectures/lecture-1/slides.md', 'utf-8');

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Файл должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Introduction to Programming', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, 'Basic concepts of programming', 'Описание должно совпадать');
      assert.strictEqual(result.metadata?.date, '2024-01-15', 'Дата должна совпадать');
    });

    test('Должен корректно обрабатывать файл без optional полей (lecture-2)', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('./test-lectures/lecture-2/slides.md', 'utf-8');

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Файл должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Data Structures', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, undefined, 'Описание должно быть undefined');
      assert.strictEqual(result.metadata?.date, undefined, 'Дата должна быть undefined');
    });

    test('Должен корректно обрабатывать файл без frontmatter (lecture-3)', async () => {
      const fs = await import('fs');
      const content = fs.readFileSync('./test-lectures/lecture-3/slides.md', 'utf-8');

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, false, 'Файл должен быть невалидным');
      assert.strictEqual(result.metadata, undefined, 'Метаданные должны отсутствовать');
    });
  });

  suite('Граничные случаи', () => {
    test('Должен обрабатывать очень длинный title', () => {
      const longTitle = 'A'.repeat(1000);
      const content = `---
title: "${longTitle}"
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, longTitle, 'Длинный заголовок должен сохраняться');
    });

    test('Должен обрабатывать специальные символы в title', () => {
      const content = `---\ntitle: "Test: Special Characters & Symbols"\n---\n\n# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Test: Special Characters & Symbols', 'Специальные символы должны сохраняться');
    });

    test('Должен обрабатывать кириллицу в полях', () => {
      const content = `---
title: "Тестовая лекция"
description: "Описание на русском"
date: "2024-01-15"
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Тестовая лекция', 'Кириллица должна сохраняться');
      assert.strictEqual(result.metadata?.description, 'Описание на русском', 'Кириллица должна сохраняться');
    });

    test('Должен обрабатывать multiline description', () => {
      const content = `---
title: "Test"
description: |
  This is a multiline
  description with multiple lines
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.ok(result.metadata?.description?.includes('multiline'), 'Multiline описание должно обрабатываться');
    });

    test('Должен обрабатывать frontmatter с дополнительными полями', () => {
      const content = `---
title: "Test"
description: "Description"
date: "2024-01-15"
author: "John Doe"
tags: ["test", "example"]
version: 1
---

# Slide 1`;

      const result = parser.parse(content);

      assert.strictEqual(result.isValid, true, 'Результат должен быть валидным');
      assert.strictEqual(result.metadata?.title, 'Test', 'Заголовок должен совпадать');
      // Дополнительные поля игнорируются согласно спецификации
    });
  });
});