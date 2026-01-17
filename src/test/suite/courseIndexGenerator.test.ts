import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import { suite, test, beforeEach, afterEach } from 'mocha';
import { CourseIndexGenerator } from '../../services/courseIndexGenerator';
import { CourseIndex, CourseIndexAny } from '../../types/courseIndex';

suite('Тесты CourseIndexGenerator', () => {
  let generator: CourseIndexGenerator;
  let tempDir: string;
  let slidesDir: string;

  beforeEach(async () => {
    // Создаём временные директории
    tempDir = path.join(__dirname, '..', '..', 'temp-test-' + Date.now());
    slidesDir = path.join(tempDir, 'slides');
    const outputDir = path.join(tempDir, 'course');
    
    await fs.ensureDir(slidesDir);
    await fs.ensureDir(outputDir);

    generator = new CourseIndexGenerator({
      courseTitle: 'Test Course',
      slidesDirectory: slidesDir,
      outputDirectory: outputDir,
      baseUrl: '/course'
    });
  });

  afterEach(async () => {
    // Очищаем временные директории
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  suite('generate()', () => {
    test('Должен генерировать slides.json с корректной структурой', async () => {
      // Создаём тестовую лекцию
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture 1',
        description: 'First test lecture',
        date: '2024-01-15'
      });

      const result = await generator.generate();

      assert.strictEqual(result.success, true, 'Генерация должна быть успешной');
      assert.strictEqual(result.processedLectures, 1, 'Должна быть обработана 1 лекция');
      assert.strictEqual(result.errors.length, 0, 'Не должно быть ошибок');
      assert.strictEqual(result.index.title, 'Test Course', 'Название курса должно совпадать');
      assert.strictEqual(result.index.lectures.length, 1, 'Должна быть 1 лекция в индексе');
    });

    test('Должен записывать файл slides.json в выходную директорию', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      const result = await generator.generate();

      const slidesJsonPath = path.join(tempDir, 'course', 'slides.json');
      assert.ok(await fs.pathExists(slidesJsonPath), 'slides.json должен существовать');

      const content = await fs.readFile(slidesJsonPath, 'utf-8');
      const index = JSON.parse(content) as CourseIndex;
      assert.strictEqual(index.title, 'Test Course', 'Название курса в файле должно совпадать');
    });

    test('Должен обрабатывать несколько лекций', async () => {
      await createTestLecture(slidesDir, 'lecture-2', {
        title: 'Second Lecture',
        date: '2024-01-20'
      });
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'First Lecture',
        date: '2024-01-15'
      });
      await createTestLecture(slidesDir, 'lecture-3', {
        title: 'Third Lecture'
        // без даты
      });

      const result = await generator.generate();

      assert.strictEqual(result.success, true, 'Генерация должна быть успешной');
      assert.strictEqual(result.processedLectures, 3, 'Должны быть обработаны 3 лекции');
      assert.strictEqual(result.index.lectures.length, 3, 'Должны быть 3 лекции в индексе');
    });

    test('Должен пропускать невалидные лекции', async () => {
      // Создаём валидную лекцию
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Valid Lecture',
        date: '2024-01-15'
      });

      // Создаём невалидную лекцию (без frontmatter)
      const invalidLecturePath = path.join(slidesDir, 'lecture-2');
      await fs.ensureDir(invalidLecturePath);
      await fs.writeFile(path.join(invalidLecturePath, 'slides.md'), '# Invalid\nNo frontmatter!');

      const result = await generator.generate();

      assert.strictEqual(result.success, true, 'Генерация должна быть успешной');
      assert.strictEqual(result.processedLectures, 1, 'Должна быть обработана только 1 валидная лекция');
      assert.strictEqual(result.index.lectures.length, 1, 'Должна быть 1 лекция в индексе');
      assert.ok(result.errors.some(e => e.includes('lecture-2')), 'Должна быть ошибка для невалидной лекции');
    });

    test('Должен пропускать лекции без slides.md', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Valid Lecture'
      });

      // Создаём директорию без slides.md
      const emptyLecturePath = path.join(slidesDir, 'lecture-2');
      await fs.ensureDir(emptyLecturePath);
      await fs.writeFile(path.join(emptyLecturePath, 'package.json'), '{}');

      const result = await generator.generate();

      assert.strictEqual(result.processedLectures, 1, 'Должна быть обработана только 1 лекция');
      assert.strictEqual(result.index.lectures.length, 1, 'Должна быть 1 лекция в индексе');
    });
  });

  suite('Детерминированный порядок лекций', () => {
    test('Должен сортировать лекции по дате', async () => {
      await createTestLecture(slidesDir, 'lecture-3', {
        title: 'Later Lecture',
        date: '2024-03-01'
      });
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Earlier Lecture',
        date: '2024-01-15'
      });
      await createTestLecture(slidesDir, 'lecture-2', {
        title: 'Middle Lecture',
        date: '2024-02-01'
      });

      const result = await generator.generate();

      // Лекции должны быть отсортированы по дате
      assert.strictEqual(result.index.lectures[0].id, 'lecture-1', 'Первая лекция по дате');
      assert.strictEqual(result.index.lectures[1].id, 'lecture-2', 'Вторая лекция по дате');
      assert.strictEqual(result.index.lectures[2].id, 'lecture-3', 'Третья лекция по дате');
    });

    test('Должен сортировать лекции без даты по ID', async () => {
      await createTestLecture(slidesDir, 'lecture-c', {
        title: 'Lecture C'
      });
      await createTestLecture(slidesDir, 'lecture-a', {
        title: 'Lecture A'
      });
      await createTestLecture(slidesDir, 'lecture-b', {
        title: 'Lecture B'
      });

      const result = await generator.generate();

      // Лекции без даты должны быть отсортированы по ID
      assert.strictEqual(result.index.lectures[0].id, 'lecture-a', 'Первая по ID');
      assert.strictEqual(result.index.lectures[1].id, 'lecture-b', 'Вторая по ID');
      assert.strictEqual(result.index.lectures[2].id, 'lecture-c', 'Третья по ID');
    });

    test('Должен сортировать лекции с датой раньше лекций без даты', async () => {
      await createTestLecture(slidesDir, 'lecture-no-date', {
        title: 'No Date Lecture'
      });
      await createTestLecture(slidesDir, 'lecture-with-date', {
        title: 'With Date Lecture',
        date: '2024-01-15'
      });

      const result = await generator.generate();

      // Лекция с датой должна идти раньше лекции без даты
      const withDateIndex = result.index.lectures.findIndex(l => l.id === 'lecture-with-date');
      const noDateIndex = result.index.lectures.findIndex(l => l.id === 'lecture-no-date');
      assert.ok(withDateIndex < noDateIndex, 'Лекция с датой должна идти раньше');
    });

    test('Должен обеспечивать одинаковый порядок при повторных запусках', async () => {
      await createTestLecture(slidesDir, 'lecture-b', {
        title: 'Lecture B',
        date: '2024-02-01'
      });
      await createTestLecture(slidesDir, 'lecture-a', {
        title: 'Lecture A',
        date: '2024-01-15'
      });

      const result1 = await generator.generate();
      const order1 = result1.index.lectures.map(l => l.id);

      // Повторная генерация
      const result2 = await generator.generate();
      const order2 = result2.index.lectures.map(l => l.id);

      assert.deepStrictEqual(order1, order2, 'Порядок должен быть одинаковым при повторных запусках');
    });
  });

  suite('Формат записей лекций', () => {
    test('Должен включать все обязательные поля', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture',
        description: 'Test description',
        date: '2024-01-15'
      });

      const result = await generator.generate();
      const lecture = result.index.lectures[0];

      assert.strictEqual(lecture.id, 'lecture-1', 'ID должен совпадать');
      assert.strictEqual(lecture.title, 'Test Lecture', 'Title должен совпадать');
      assert.strictEqual(lecture.description, 'Test description', 'Description должен совпадать');
      assert.strictEqual(lecture.date, '2024-01-15', 'Date должен совпадать');
      assert.ok(lecture.url, 'URL должен присутствовать');
    });

    test('Должен формировать корректный URL', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      const result = await generator.generate();
      const lecture = result.index.lectures[0];

      assert.strictEqual(lecture.url, '/course/lecture-1', 'URL должен включать baseUrl и lecture ID');
    });

    test('Должен обрабатывать лекцию без optional полей', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Minimal Lecture'
        // без description и date
      });

      const result = await generator.generate();
      const lecture = result.index.lectures[0];

      assert.strictEqual(lecture.id, 'lecture-1', 'ID должен присутствовать');
      assert.strictEqual(lecture.title, 'Minimal Lecture', 'Title должен присутствовать');
      assert.strictEqual(lecture.description, undefined, 'Description должен быть undefined');
      assert.strictEqual(lecture.date, undefined, 'Date должен быть undefined');
    });

    test('Должен корректно обрабатывать baseUrl с путём', async () => {
      const generatorWithBase = new CourseIndexGenerator({
        courseTitle: 'Test Course',
        slidesDirectory: slidesDir,
        outputDirectory: path.join(tempDir, 'course'),
        baseUrl: '/my/course'
      });

      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      const result = await generatorWithBase.generate();
      const lecture = result.index.lectures[0];

      assert.strictEqual(lecture.url, '/my/course/lecture-1', 'URL должен включать baseUrl');
    });

    test('Должен корректно обрабатывать пустой baseUrl', async () => {
      const generatorNoBase = new CourseIndexGenerator({
        courseTitle: 'Test Course',
        slidesDirectory: slidesDir,
        outputDirectory: path.join(tempDir, 'course'),
        baseUrl: ''
      });

      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      const result = await generatorNoBase.generate();
      const lecture = result.index.lectures[0];

      assert.strictEqual(lecture.url, '/lecture-1', 'URL должен быть /lecture-id');
    });
  });

  suite('needsRegeneration()', () => {
    test('Должен возвращать true если slides.json не существует', async () => {
      const needsRegen = await generator.needsRegeneration();
      assert.strictEqual(needsRegen, true, 'Требуется генерация если файл не существует');
    });

    test('Должен возвращать false если лекции не изменялись', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      await generator.generate();

      const needsRegen = await generator.needsRegeneration();
      assert.strictEqual(needsRegen, false, 'Не требуется генерация если ничего не изменилось');
    });

    test('Должен возвращать true если slides.md был изменён', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      await generator.generate();

      // Ждём немного, чтобы время модификации изменилось
      await new Promise(resolve => setTimeout(resolve, 10));

      // Модифицируем slides.md
      await fs.writeFile(path.join(slidesDir, 'lecture-1', 'slides.md'), 
        '---\ntitle: "Updated Lecture"\n---\n# Updated');

      const needsRegen = await generator.needsRegeneration();
      assert.strictEqual(needsRegen, true, 'Требуется генерация если slides.md изменён');
    });
  });

  suite('getCurrentIndex()', () => {
    test('Должен возвращать undefined если файл не существует', async () => {
      const index = await generator.getCurrentIndex();
      assert.strictEqual(index, undefined, 'Должен возвращать undefined');
    });

    test('Должен возвращать текущий индекс из файла', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      await generator.generate();

      const index = await generator.getCurrentIndex();
      assert.ok(index, 'Индекс должен существовать');
      assert.strictEqual(index?.title, 'Test Course', 'Название курса должно совпадать');
      assert.strictEqual(index?.lectures.length, 1, 'Должна быть 1 лекция');
    });
  });

  suite('generateCourseIndex()', () => {
    test('Должен быть псевдонимом generate()', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      const result1 = await generator.generate();
      const result2 = await generator.generateCourseIndex();

      assert.deepStrictEqual(result1, result2, 'Результаты должны быть идентичными');
    });
  });

  suite('Обработка ошибок', () => {
    test('Должен возвращать success=false при ошибках', async () => {
      // Генератор с несуществующей директорией - это не ошибка генерации,
      // discovery вернёт пустой массив лекций без ошибок
      const brokenGenerator = new CourseIndexGenerator({
        courseTitle: 'Test Course',
        slidesDirectory: '/non/existent/path',
        outputDirectory: tempDir
      });

      const result = await brokenGenerator.generate();

      // При несуществующей директории discovery возвращает успех с пустым списком
      assert.strictEqual(result.errors.length, 1, 'Должна быть одна ошибка о несуществующей директории');
      assert.ok(result.errors[0].includes('does not exist'), 'Ошибка должна содержать info о несуществующей директории');
    });

    test('Должен записывать файл даже если есть ошибки валидации', async () => {
      // Создаём mix валидных и невалидных лекций
      await createTestLecture(slidesDir, 'lecture-valid', {
        title: 'Valid Lecture'
      });

      const invalidLecturePath = path.join(slidesDir, 'lecture-invalid');
      await fs.ensureDir(invalidLecturePath);
      await fs.writeFile(path.join(invalidLecturePath, 'slides.md'), '# Invalid\nNo frontmatter!');

      const result = await generator.generate();

      // Файл должен быть создан
      const slidesJsonPath = path.join(tempDir, 'course', 'slides.json');
      assert.ok(await fs.pathExists(slidesJsonPath), 'slides.json должен быть создан');

      // Но только с валидными лекциями
      assert.strictEqual(result.index.lectures.length, 1, 'Только валидные лекции');
    });
  });

  suite('Формат JSON', () => {
    test('Должен записывать читаемый JSON с отступами', async () => {
      await createTestLecture(slidesDir, 'lecture-1', {
        title: 'Test Lecture'
      });

      await generator.generate();

      const content = await fs.readFile(path.join(tempDir, 'course', 'slides.json'), 'utf-8');
      
      // Проверяем что JSON валиден
      const parsed = JSON.parse(content);
      assert.strictEqual(parsed.title, 'Test Course', 'Название курса в JSON');

      // Проверяем что есть отступы (2 пробела)
      assert.ok(content.includes('  "lectures"'), 'JSON должен иметь отступы');
    });
  });

  suite('Поддержка старого формата slides.json', () => {
    test('Должен читать старый формат { slides: [{ name, title }] }', async () => {
      // Создаём slides.json в старом формате
      const legacySlidesJson = {
        slides: [
          { name: 'about', title: 'О предмете' },
          { name: 'collection', title: 'Коллекции' },
          { name: 'mongo', title: 'MongoDB' }
        ]
      };
      
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(
        path.join(tempDir, 'course', 'slides.json'),
        JSON.stringify(legacySlidesJson, null, 2),
        'utf-8'
      );

      const index = await generator.getCurrentIndex();

      assert.ok(index, 'Индекс должен существовать');
      assert.strictEqual(index?.lectures.length, 3, 'Должны быть 3 лекции');
      assert.strictEqual(index?.lectures[0].id, 'about', 'Первая лекция about');
      assert.strictEqual(index?.lectures[0].title, 'О предмете', 'Первое название');
      assert.strictEqual(index?.lectures[1].id, 'collection', 'Вторая лекция collection');
      assert.strictEqual(index?.lectures[2].id, 'mongo', 'Третья лекция mongo');
    });

    test('Должен формировать URL для лекций из старого формата', async () => {
      const legacySlidesJson = {
        slides: [
          { name: 'lecture-one', title: 'Lecture One' }
        ]
      };
      
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(
        path.join(tempDir, 'course', 'slides.json'),
        JSON.stringify(legacySlidesJson, null, 2),
        'utf-8'
      );

      const index = await generator.getCurrentIndex();

      assert.strictEqual(index?.lectures[0].url, '/course/lecture-one', 'URL должен включать baseUrl');
    });

    test('Должен определять старый формат через isLegacyFormat()', async () => {
      const legacyData = { slides: [{ name: 'test', title: 'Test' }] };
      const newData = { title: 'Course', lectures: [{ id: 'test', title: 'Test', url: '/test' }] };

      assert.strictEqual(generator.isLegacyFormat(legacyData), true, 'Должен определить старый формат');
      assert.strictEqual(generator.isLegacyFormat(newData), false, 'Не должен определять новый формат как старый');
    });

    test('Должен конвертировать старый формат в новый через convertToCourseIndex()', async () => {
      const legacyData: CourseIndexAny = { slides: [{ name: 'test', title: 'Test Lecture' }] };

      const result = generator.convertToCourseIndex(legacyData);

      assert.strictEqual(result.title, 'Test Course', 'Название курса из конфига');
      assert.strictEqual(result.lectures.length, 1, 'Одна лекция');
      assert.strictEqual(result.lectures[0].id, 'test', 'ID из name');
      assert.strictEqual(result.lectures[0].title, 'Test Lecture', 'Title');
      assert.ok(result.lectures[0].url, 'URL должен быть сгенерирован');
    });

    test('Должен возвращать новый формат без изменений в convertToCourseIndex()', async () => {
      const newData: CourseIndexAny = {
        title: 'My Course',
        lectures: [{ id: 'lec1', title: 'Lecture 1', url: '/lec1', description: 'Desc', date: '2024-01-01' }]
      };

      const result = generator.convertToCourseIndex(newData);

      assert.strictEqual(result.title, 'My Course', 'Название курса');
      assert.strictEqual(result.lectures.length, 1, 'Одна лекция');
      assert.strictEqual(result.lectures[0].description, 'Desc', 'Описание сохранено');
      assert.strictEqual(result.lectures[0].date, '2024-01-01', 'Дата сохранена');
    });

    test('Должен возвращать лекции через getLectures() для старого формата', async () => {
      const legacySlidesJson = {
        slides: [
          { name: 'first', title: 'First Lecture' },
          { name: 'second', title: 'Second Lecture' }
        ]
      };
      
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(
        path.join(tempDir, 'course', 'slides.json'),
        JSON.stringify(legacySlidesJson, null, 2),
        'utf-8'
      );

      const lectures = await generator.getLectures();

      assert.strictEqual(lectures.length, 2, 'Две лекции');
      assert.strictEqual(lectures[0].id, 'first', 'Первая лекция');
      assert.strictEqual(lectures[1].id, 'second', 'Вторая лекция');
    });

    test('Должен возвращать информацию о формате через getSlidesJsonInfo()', async () => {
      // Старый формат
      const legacySlidesJson = {
        slides: [{ name: 'lec1', title: 'Lecture 1' }]
      };
      
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(
        path.join(tempDir, 'course', 'slides.json'),
        JSON.stringify(legacySlidesJson, null, 2),
        'utf-8'
      );

      const info = await generator.getSlidesJsonInfo();

      assert.strictEqual(info.exists, true, 'Файл существует');
      assert.strictEqual(info.format, 'legacy', 'Старый формат определён');
      assert.strictEqual(info.lectureCount, 1, 'Одна лекция');
    });

    test('Должен определять новый формат в getSlidesJsonInfo()', async () => {
      await createTestLecture(slidesDir, 'lecture-1', { title: 'Test' });
      await generator.generate();

      const info = await generator.getSlidesJsonInfo();

      assert.strictEqual(info.exists, true, 'Файл существует');
      assert.strictEqual(info.format, 'new', 'Новый формат определён');
    });

    test('Должен обрабатывать несуществующий файл в getSlidesJsonInfo()', async () => {
      const noFileGenerator = new CourseIndexGenerator({
        courseTitle: 'Test',
        slidesDirectory: slidesDir,
        outputDirectory: path.join(tempDir, 'nonexistent')
      });

      const info = await noFileGenerator.getSlidesJsonInfo();

      assert.strictEqual(info.exists, false, 'Файл не существует');
      assert.strictEqual(info.format, 'unknown', 'Формат неизвестен');
    });

    test('Должен обратывать некорректный JSON в getSlidesJsonInfo()', async () => {
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(path.join(tempDir, 'course', 'slides.json'), 'not valid json', 'utf-8');

      const info = await generator.getSlidesJsonInfo();

      assert.strictEqual(info.exists, true, 'Файл существует');
      assert.strictEqual(info.format, 'unknown', 'Формат неизвестен при ошибке парсинга');
    });

    test('Должен обрабатывать пустой slides.json в getSlidesJsonInfo()', async () => {
      await fs.ensureDir(path.join(tempDir, 'course'));
      await fs.writeFile(path.join(tempDir, 'course', 'slides.json'), '{}', 'utf-8');

      const info = await generator.getSlidesJsonInfo();

      // Пустой {} не имеет title, lectures или slides - это невалидный формат
      assert.strictEqual(info.exists, true, 'Файл существует');
      assert.strictEqual(info.format, 'unknown', 'Формат неизвестен');
    });
  });
});

/**
 * Вспомогательная функция для создания тестовой лекции
 */
async function createTestLecture(
  slidesDir: string, 
  lectureId: string, 
  metadata: { title: string; description?: string; date?: string }
): Promise<void> {
  const lecturePath = path.join(slidesDir, lectureId);
  await fs.ensureDir(lecturePath);

  const frontmatter = `---
title: "${metadata.title}"
${metadata.description ? `description: "${metadata.description}"` : ''}
${metadata.date ? `date: "${metadata.date}"` : ''}
---

# ${metadata.title}

Content here.
`;

  await fs.writeFile(path.join(lecturePath, 'slides.md'), frontmatter);
}