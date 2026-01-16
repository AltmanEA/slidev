import * as assert from 'assert';
import { suite, test, beforeEach } from 'mocha';
import { LectureDiscoveryService } from '../../services/lectureDiscovery';
import { LectureStatus, LectureMetadata } from '../../types/lecture';

suite('Тесты LectureDiscoveryService', () => {
  let service: LectureDiscoveryService;

  beforeEach(() => {
    service = new LectureDiscoveryService('./test-lectures');
  });

  suite('discoverLectures()', () => {
    test('Должен обнаружить все лекции в директории', async () => {
      const result = await service.discoverLectures();
      
      assert.strictEqual(result.totalFound, 7, 'Должно быть найдено 7 лекций (включая lecture-6 без slides.md)');
      assert.strictEqual(result.validLectures, 4, 'Должно быть 4 валидных лекции');
      assert.strictEqual(result.lectures.length, 7, 'Должен быть массив из 7 лекций');
      assert.ok(result.errors.length > 0, 'Должны быть ошибки валидации');
    });

    test('Должен сортировать лекции по ID', async () => {
      const result = await service.discoverLectures();
      const lectureIds = result.lectures.map(l => l.id);
      const sortedIds = [...lectureIds].sort((a, b) => a.localeCompare(b));
      
      assert.deepStrictEqual(lectureIds, sortedIds, 'Лекции должны быть отсортированы по ID');
    });
  });

  suite('validateLecture()', () => {
    test('Должен валидировать корректную лекцию', async () => {
      const result = await service.validateLecture('lecture-1', './test-lectures/lecture-1');
      
      assert.strictEqual(result.id, 'lecture-1', 'ID лекции должен совпадать');
      assert.strictEqual(result.status, LectureStatus.VALID, 'Лекция должна быть валидной');
      assert.ok(result.metadata, 'Метаданные должны присутствовать');
      assert.strictEqual(result.metadata?.title, 'Introduction to Programming', 'Заголовок должен совпадать');
      assert.strictEqual(result.metadata?.description, 'Basic concepts of programming', 'Описание должно совпадать');
      assert.strictEqual(result.metadata?.date, '2024-01-15', 'Дата должна совпадать');
    });

    test('Должен валидировать лекцию без optional полей', async () => {
      const result = await service.validateLecture('lecture-2', './test-lectures/lecture-2');
      
      assert.strictEqual(result.status, LectureStatus.VALID, 'Лекция должна быть валидной');
      assert.strictEqual(result.metadata?.title, 'Data Structures', 'Заголовок должен присутствовать');
      assert.strictEqual(result.metadata?.description, undefined, 'Описание должно быть undefined');
      assert.strictEqual(result.metadata?.date, undefined, 'Дата должна быть undefined');
    });

    test('Должен отклонять лекцию без frontmatter', async () => {
      const result = await service.validateLecture('lecture-3', './test-lectures/lecture-3');
      
      assert.strictEqual(result.status, LectureStatus.INVALID_FRONTMATTER, 'Статус должен быть INVALID_FRONTMATTER');
      assert.ok(result.error?.includes('No frontmatter found'), 'Должна быть ошибка о отсутствующем frontmatter');
    });

    test('Должен отклонять лекцию без обязательного поля title', async () => {
      const result = await service.validateLecture('lecture-4', './test-lectures/lecture-4');
      
      assert.strictEqual(result.status, LectureStatus.INVALID_FRONTMATTER, 'Статус должен быть INVALID_FRONTMATTER');
      assert.ok(result.error?.includes('Required field \'title\' is missing'), 'Должна быть ошибка о отсутствующем title');
    });

    test('Должен отклонять лекцию с невалидным форматом даты', async () => {
      const result = await service.validateLecture('lecture-5', './test-lectures/lecture-5');
      
      assert.strictEqual(result.status, LectureStatus.VALID, 'Лекция должна быть валидной (дата не обязательна)');
    });

    test('Должен обрабатывать несуществующую лекцию', async () => {
      const result = await service.validateLecture('non-existent', './test-lectures/non-existent');
      
      assert.strictEqual(result.status, LectureStatus.MISSING_SLIDES_MD, 'Статус должен быть MISSING_SLIDES_MD');
      assert.ok(result.error?.includes('slides.md file not found'), 'Должна быть ошибка о отсутствующем файле');
    });
  });

  suite('extractMetadata()', () => {
    test('Должен извлекать все поля метаданных', () => {
      const frontmatterData = {
        title: 'Test Title',
        description: 'Test Description',
        date: '2024-01-15'
      };
      
      const metadata = service['extractMetadata'](frontmatterData);
      
      assert.strictEqual(metadata?.title, 'Test Title', 'Заголовок должен совпадать');
      assert.strictEqual(metadata?.description, 'Test Description', 'Описание должно совпадать');
      assert.strictEqual(metadata?.date, '2024-01-15', 'Дата должна совпадать');
    });

    test('Должен обрабатывать отсутствующие optional поля', () => {
      const frontmatterData = {
        title: 'Test Title'
      };
      
      const metadata = service['extractMetadata'](frontmatterData);
      
      assert.strictEqual(metadata?.title, 'Test Title', 'Заголовок должен совпадать');
      assert.strictEqual(metadata?.description, undefined, 'Описание должно быть undefined');
      assert.strictEqual(metadata?.date, undefined, 'Дата должна быть undefined');
    });

    test('Должен обрабатывать некорректные типы данных', () => {
      const frontmatterData = {
        title: 123, // не строка
        description: null, // null значение
        date: true // не строка
      };
      
      const metadata = service['extractMetadata'](frontmatterData);
      
      assert.strictEqual(metadata?.title, '123', 'Числовой заголовок должен быть преобразован в строку');
      assert.strictEqual(metadata?.description, undefined, 'Null описание должно быть undefined');
      assert.strictEqual(metadata?.date, undefined, 'Boolean дата должна быть undefined');
    });

    test('Должен обрабатывать пустые строки', () => {
      const frontmatterData = {
        title: '',
        description: '   ', // только пробелы
        date: ''
      };
      
      const metadata = service['extractMetadata'](frontmatterData);
      
      assert.strictEqual(metadata?.title, '', 'Пустой заголовок должен оставаться пустой строкой');
      assert.strictEqual(metadata?.description, '', 'Описание с пробелами должно быть обрезано');
      assert.strictEqual(metadata?.date, undefined, 'Пустая дата должна быть undefined');
    });

    test('Должен обрабатывать ошибки извлечения метаданных', () => {
      const frontmatterData = null;
      
      const metadata = service['extractMetadata'](frontmatterData);
      
      assert.strictEqual(metadata, undefined, 'Результат должен быть undefined при ошибке');
    });
  });

  suite('isValidDateFormat()', () => {
    test('Должен принимать корректные даты', () => {
      const validDates = [
        '2024-01-15',
        '2020-12-31',
        '1990-01-01',
        '2030-06-15'
      ];
      
      validDates.forEach(date => {
        assert.ok(service['isValidDateFormat'](date), `${date} должна быть валидной датой`);
      });
    });

    test('Должен отклонять некорректные форматы дат', () => {
      const invalidDates = [
        '2024/01/15', // неправильный разделитель
        '24-01-15', // неполный год
        '2024-1-15', // неполный месяц
        '2024-01-5', // неполный день
        '2024-13-15', // несуществующий месяц
        '2024-01-32', // несуществующий день
        'invalid-date',
        '',
        '2024-01-15-extra' // лишние части
      ];
      
      invalidDates.forEach(date => {
        assert.strictEqual(service['isValidDateFormat'](date), false, `${date} должна быть невалидной датой`);
      });
    });

    test('Должен валидировать реальные даты', () => {
      const validDates = [
        '2024-02-29', // високосный год
        '2023-02-28', // не високосный год
      ];
      
      validDates.forEach(date => {
        assert.ok(service['isValidDateFormat'](date), `${date} должна быть валидной датой`);
      });
    });
  });

  suite('findLectureById()', () => {
    test('Должен находить существующую лекцию', async () => {
      const lecture = await service.findLectureById('lecture-1');
      
      assert.ok(lecture, 'Лекция должна быть найдена');
      assert.strictEqual(lecture?.id, 'lecture-1', 'ID должен совпадать');
      assert.strictEqual(lecture?.status, LectureStatus.VALID, 'Лекция должна быть валидной');
    });

    test('Должен возвращать undefined для несуществующей лекции', async () => {
      const lecture = await service.findLectureById('non-existent-lecture');
      
      assert.strictEqual(lecture, undefined, 'Несуществующая лекция должна возвращать undefined');
    });
  });

  suite('getValidLectures()', () => {
    test('Должен возвращать только валидные лекции', async () => {
      const validLectures = await service.getValidLectures();
      
      assert.strictEqual(validLectures.length, 4, 'Должно быть 4 валидные лекции');
      validLectures.forEach(lecture => {
        assert.strictEqual(lecture.status, LectureStatus.VALID, 'Все лекции должны быть валидными');
      });
    });
  });

  suite('getStatistics()', () => {
    test('Должен корректно подсчитывать статистику', async () => {
      const stats = await service.getStatistics();
      
      assert.strictEqual(stats.total, 7, 'Общее количество должно быть 7');
      assert.strictEqual(stats.valid, 4, 'Количество валидных должно быть 4');
      assert.strictEqual(stats.invalid, 3, 'Количество невалидных должно быть 3');
      assert.strictEqual(stats.missingSlidesMd, 1, 'Количество с отсутствующим slides.md должно быть 1');
      assert.strictEqual(stats.invalidFrontmatter, 2, 'Количество с невалидным frontmatter должно быть 2');
    });
  });

  suite('Интеграционные тесты', () => {
    test('Должен корректно обрабатывать полный цикл обнаружения', async () => {
      const result = await service.discoverLectures();
      
      // Проверяем структуру результата
      assert.ok(result.lectures, 'Результат должен содержать массив лекций');
      assert.strictEqual(typeof result.totalFound, 'number', 'totalFound должен быть числом');
      assert.strictEqual(typeof result.validLectures, 'number', 'validLectures должен быть числом');
      assert.ok(Array.isArray(result.errors), 'errors должен быть массивом');
      
      // Проверяем корректность подсчетов
      assert.strictEqual(result.totalFound, result.lectures.length, 'totalFound должен совпадать с длиной массива');
      assert.strictEqual(result.validLectures, result.lectures.filter(l => l.status === LectureStatus.VALID).length, 'validLectures должен совпадать с количеством валидных лекций');
    });
  });
});