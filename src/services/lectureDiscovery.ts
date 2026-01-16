import * as path from "path";
import * as fs from "fs-extra";
import * as fg from "fast-glob";
import matter from "gray-matter";
import { LectureInfo, LectureMetadata, LectureStatus, DiscoveryResult, ValidationResult } from "../types/lecture";

/**
 * Сервис для обнаружения и валидации лекций Slidev
 * Согласно спецификации: сканирует slides/, обнаруживает лекции по slides.md,
 * валидирует структуру лекции
 */
export class LectureDiscoveryService {
  private slidesDirectory: string;

  constructor(slidesDirectory: string) {
    this.slidesDirectory = path.resolve(slidesDirectory);
  }

  /**
   * Обнаруживает все лекции в директории slides/
   * @returns результат сканирования с информацией о найденных лекциях
   */
  async discoverLectures(): Promise<DiscoveryResult> {
    const result: DiscoveryResult = {
      lectures: [],
      totalFound: 0,
      validLectures: 0,
      errors: []
    };

    try {
      // Проверяем существование директории slides
      if (!await fs.pathExists(this.slidesDirectory)) {
        result.errors.push(`Slides directory does not exist: ${this.slidesDirectory}`);
        return result;
      }

      // Ищем все директории в slides/
      const directories = await fs.readdir(this.slidesDirectory);
      
      for (const dirName of directories) {
        const dirPath = path.join(this.slidesDirectory, dirName);
        
        try {
          // Проверяем, что это директория, а не файл
          const stats = await fs.stat(dirPath);
          if (!stats.isDirectory()) {
            continue;
          }

          // Валидируем лекцию
          const lectureInfo = await this.validateLecture(dirName, dirPath);
          result.lectures.push(lectureInfo);
          result.totalFound++;

          if (lectureInfo.status === LectureStatus.VALID) {
            result.validLectures++;
          } else {
            result.errors.push(`Lecture "${dirName}": ${lectureInfo.error}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Error processing lecture "${dirName}": ${errorMessage}`);
        }
      }

      // Сортируем лекции по ID для детерминистичности
      result.lectures.sort((a, b) => a.id.localeCompare(b.id));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to scan slides directory: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Валидирует отдельную лекцию согласно спецификации
   * Лекция считается валидной если:
   * - директория существует под slides/
   * - содержит файл slides.md
   * - файл содержит валидный frontmatter блок
   * - frontmatter содержит обязательное поле title
   * @param lectureId - идентификатор лекции (имя директории)
   * @param lecturePath - путь к директории лекции
   * @returns информация о лекции с результатом валидации
   */
  async validateLecture(lectureId: string, lecturePath: string): Promise<LectureInfo> {
    const slidesMdPath = path.join(lecturePath, "slides.md");

    // Проверяем существование slides.md
    if (!await fs.pathExists(slidesMdPath)) {
      return {
        id: lectureId,
        path: lecturePath,
        slidesMdPath,
        status: LectureStatus.MISSING_SLIDES_MD,
        error: "slides.md file not found"
      };
    }

    try {
      // Читаем и парсим slides.md
      const fileContent = await fs.readFile(slidesMdPath, "utf-8");
      
      // Парсим frontmatter с помощью gray-matter
      const parsed = matter(fileContent);
      
      // Проверяем наличие данных frontmatter
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        return {
          id: lectureId,
          path: lecturePath,
          slidesMdPath,
          status: LectureStatus.INVALID_FRONTMATTER,
          error: "No frontmatter found in slides.md"
        };
      }

      // Валидируем и извлекаем метаданные
      const metadata = this.extractMetadata(parsed.data);
      
      if (!metadata?.title) {
        return {
          id: lectureId,
          path: lecturePath,
          slidesMdPath,
          status: LectureStatus.INVALID_FRONTMATTER,
          error: "Required field 'title' is missing from frontmatter"
        };
      }

      // Лекция валидна
      return {
        id: lectureId,
        path: lecturePath,
        slidesMdPath,
        metadata,
        status: LectureStatus.VALID
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        id: lectureId,
        path: lecturePath,
        slidesMdPath,
        status: LectureStatus.INVALID_FRONTMATTER,
        error: `Failed to parse slides.md: ${errorMessage}`
      };
    }
  }

  /**
   * Извлекает и валидирует метаданные из frontmatter
   * @param frontmatterData - данные из frontmatter
   * @returns валидированные метаданные лекции
   */
  private extractMetadata(frontmatterData: any): LectureMetadata | undefined {
    try {
      const metadata: LectureMetadata = {
        title: String(frontmatterData.title || "").trim()
      };

      // Опциональные поля
      if (frontmatterData.description) {
        metadata.description = String(frontmatterData.description).trim();
      }

      if (frontmatterData.date) {
        const dateStr = String(frontmatterData.date).trim();
        // Валидируем формат даты YYYY-MM-DD
        if (this.isValidDateFormat(dateStr)) {
          metadata.date = dateStr;
        }
      }

      return metadata;
    } catch (error) {
      // В случае ошибки извлечения метаданных возвращаем undefined
      return undefined;
    }
  }

  /**
   * Проверяет корректность формата даты YYYY-MM-DD
   * @param dateStr - строка с датой
   * @returns true если формат корректный
   */
  private isValidDateFormat(dateStr: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      return false;
    }

    try {
      const date = new Date(dateStr);
      // Проверяем, что дата валидна
      return date instanceof Date && !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Находит лекцию по ID
   * @param lectureId - идентификатор лекции
   * @returns информация о лекции или undefined если не найдена
   */
  async findLectureById(lectureId: string): Promise<LectureInfo | undefined> {
    const result = await this.discoverLectures();
    return result.lectures.find(lecture => lecture.id === lectureId);
  }

  /**
   * Получает только валидные лекции
   * @returns массив валидных лекций
   */
  async getValidLectures(): Promise<LectureInfo[]> {
    const result = await this.discoverLectures();
    return result.lectures.filter(lecture => lecture.status === LectureStatus.VALID);
  }

  /**
   * Получает статистику по лекциям
   * @returns статистика обнаруженных лекций
   */
  async getStatistics(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    missingSlidesMd: number;
    invalidFrontmatter: number;
  }> {
    const result = await this.discoverLectures();
    
    return {
      total: result.totalFound,
      valid: result.validLectures,
      invalid: result.totalFound - result.validLectures,
      missingSlidesMd: result.lectures.filter(l => l.status === LectureStatus.MISSING_SLIDES_MD).length,
      invalidFrontmatter: result.lectures.filter(l => l.status === LectureStatus.INVALID_FRONTMATTER).length
    };
  }
}