import matter from "gray-matter";
import { LectureMetadata, FrontmatterParseResult, FrontmatterValidationError } from "../types/frontmatter";

/**
 * Сервис для парсинга и валидации YAML frontmatter из файлов slides.md
 * Согласно спецификации:
 * - Поддерживает поля: title (REQUIRED), description (OPTIONAL), date (OPTIONAL)
 * - Формат даты: YYYY-MM-DD
 * - frontmatter является единственным источником метаданных
 */
export class FrontmatterParser {
  /**
   * Парсит frontmatter из содержимого файла slides.md
   * @param content - содержимое файла slides.md
   * @returns результат парсинга с метаданными или ошибками
   */
  parse(content: string): FrontmatterParseResult {
    const result: FrontmatterParseResult = {
      isValid: false,
      metadata: undefined,
      errors: []
    };

    try {
      // Проверяем наличие frontmatter
      if (!content.startsWith("---")) {
        result.errors.push(FrontmatterValidationError.NO_FRONTMATTER);
        return result;
      }

      // Парсим frontmatter с помощью gray-matter
      const parsed = matter(content);

      // Проверяем наличие данных frontmatter
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        result.errors.push(FrontmatterValidationError.EMPTY_FRONTMATTER);
        return result;
      }

      // Валидируем и извлекаем метаданные
      const validationResult = this.extractAndValidateMetadata(parsed.data);

      if (validationResult.errors.length > 0) {
        result.errors = validationResult.errors;
        return result;
      }

      result.isValid = true;
      result.metadata = validationResult.metadata;
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`${FrontmatterValidationError.PARSE_ERROR}: ${errorMessage}`);
      return result;
    }
  }

  /**
   * Извлекает и валидирует метаданные из данных frontmatter
   * @param frontmatterData - распарсенные данные frontmatter
   * @returns результат валидации с метаданными или ошибками
   */
  private extractAndValidateMetadata(
    frontmatterData: any
  ): { metadata: LectureMetadata; errors: string[] } {
    const errors: string[] = [];
    const metadata: LectureMetadata = {
      title: "",
      description: undefined,
      date: undefined
    };

    // Валидируем и извлекаем title (обязательное поле)
    if (!frontmatterData.hasOwnProperty("title")) {
      errors.push(FrontmatterValidationError.MISSING_TITLE);
    } else {
      const title = this.valueToString(frontmatterData.title);
      if (!title) {
        errors.push(FrontmatterValidationError.EMPTY_TITLE);
      } else {
        metadata.title = title;
      }
    }

    // Валидируем и извлекаем description (опциональное поле)
    if (frontmatterData.hasOwnProperty("description")) {
      const description = this.normalizeString(frontmatterData.description);
      if (description !== undefined) {
        metadata.description = description;
      }
    }

    // Валидируем и извлекаем date (опциональное поле, формат YYYY-MM-DD)
    if (frontmatterData.hasOwnProperty("date")) {
      const dateResult = this.parseDate(frontmatterData.date);
      if (dateResult.error) {
        errors.push(dateResult.error);
      } else {
        metadata.date = dateResult.value;
      }
    }

    return { metadata, errors };
  }

  /**
   * Нормализует строковое значение (обрезает пробелы)
   * @param value - исходное значение
   * @returns нормализованная строка или undefined для null/undefined
   */
  private normalizeString(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const str = String(value).trim();
    return str || undefined;
  }

  /**
   * Преобразует значение в строку для полей frontmatter
   * @param value - исходное значение (включая boolean, number)
   * @returns строковое представление
   */
  private valueToString(value: any): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }

    const str = String(value).trim();
    return str || undefined;
  }

  /**
   * Парсит и валидирует дату в формате YYYY-MM-DD
   * @param dateValue - значение даты из frontmatter
   * @returns результат с валидной датой или ошибкой
   */
  private parseDate(dateValue: any): { value: string | undefined; error: string | undefined } {
    const dateStr = this.normalizeString(dateValue);

    if (!dateStr) {
      return { value: undefined, error: undefined };
    }

    // Проверяем формат YYYY-MM-DD с помощью регулярного выражения
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return {
        value: undefined,
        error: FrontmatterValidationError.INVALID_DATE_FORMAT
      };
    }

    // Разбираем компоненты даты
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(5, 7), 10);
    const day = parseInt(dateStr.substring(8, 10), 10);

    // Проверяем диапазон месяца
    if (month < 1 || month > 12) {
      return {
        value: undefined,
        error: FrontmatterValidationError.INVALID_DATE_VALUE
      };
    }

    // Проверяем количество дней в месяце
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return {
        value: undefined,
        error: FrontmatterValidationError.INVALID_DATE_VALUE
      };
    }

    return { value: dateStr, error: undefined };
  }

  /**
   * Проверяет, содержит ли файл валидный frontmatter
   * @param content - содержимое файла slides.md
   * @returns true если frontmatter валиден
   */
  isValid(content: string): boolean {
    const result = this.parse(content);
    return result.isValid;
  }

  /**
   * Извлекает только метаданные из файла
   * @param content - содержимое файла slides.md
   * @returns метаданные или undefined если парсинг неуспешен
   */
  extractMetadata(content: string): LectureMetadata | undefined {
    const result = this.parse(content);
    return result.metadata;
  }

  /**
   * Проверяет наличие обязательного поля title
   * @param content - содержимое файла slides.md
   * @returns true если title присутствует
   */
  hasTitle(content: string): boolean {
    try {
      if (!content.startsWith("---")) {
        return false;
      }

      const parsed = matter(content);
      return parsed.data.hasOwnProperty("title") && Boolean(this.normalizeString(parsed.data.title));
    } catch {
      return false;
    }
  }
}