import * as path from "path";
import * as fs from "fs-extra";
import matter from "gray-matter";
import { LectureDiscoveryService } from "./lectureDiscovery";
import { 
  CourseIndex, 
  CourseIndexLecture, 
  CourseIndexGenerationResult, 
  CourseIndexGeneratorConfig,
  LegacyCourseIndex,
  LegacyCourseIndexLecture,
  CourseIndexAny
} from "../types/courseIndex";
import { LectureStatus, LectureInfo } from "../types/lecture";

/**
 * Сервис для генерации course index (slides.json)
 * Согласно спецификации:
 * - Генерирует slides.json из обнаруженных лекций
 * - Сортирует и структурирует данные
 * - Обеспечивает детерминированный порядок лекций
 * - Поддерживает чтение старого ({ slides: [{ name, title }] }) и нового ({ title, lectures: [...] }) форматов
 */
export class CourseIndexGenerator {
  private config: CourseIndexGeneratorConfig;
  private discoveryService: LectureDiscoveryService;

  constructor(config: CourseIndexGeneratorConfig) {
    this.config = {
      baseUrl: config.baseUrl ?? "",
      ...config
    };
    
    // Инициализируем discovery service с директорией лекций
    this.discoveryService = new LectureDiscoveryService(this.config.slidesDirectory);
  }

  /**
   * Генерирует slides.json из обнаруженных лекций
   * Записывает в новом формате: { title, lectures: [{ id, title, url, ... }] }
   * @returns результат генерации с информацией о процессе
   */
  async generate(): Promise<CourseIndexGenerationResult> {
    const result: CourseIndexGenerationResult = {
      index: {
        title: this.config.courseTitle,
        lectures: []
      },
      outputPath: "",
      processedLectures: 0,
      errors: [],
      success: false
    };

    try {
      // Обнаруживаем все лекции
      const discoveryResult = await this.discoveryService.discoverLectures();

      // Фильтруем только валидные лекции и сортируем детерминированно
      const validLectures = discoveryResult.lectures
        .filter(lecture => lecture.status === LectureStatus.VALID)
        .sort((a, b) => this.sortLectures(a, b));

      // Преобразуем лекции в формат course index
      const courseLectures: CourseIndexLecture[] = [];
      
      for (const lecture of validLectures) {
        try {
          const courseLecture = await this.lectureToCourseIndexEntry(lecture);
          courseLectures.push(courseLecture);
          result.processedLectures++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to process lecture "${lecture.id}": ${errorMessage}`);
        }
      }

      // Формируем итоговый индекс
      result.index.lectures = courseLectures;

      // Определяем путь к выходному файлу
      const outputPath = path.join(this.config.outputDirectory, "slides.json");
      result.outputPath = outputPath;

      // Записываем файл
      await this.writeCourseIndex(result.index, outputPath);

      // Добавляем ошибки discovery, если есть
      if (discoveryResult.errors.length > 0) {
        result.errors.push(...discoveryResult.errors);
      }

      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to generate course index: ${errorMessage}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Сортирует две лекции для детерминированного порядка
   * Приоритет сортировки:
   * 1. По дате (если доступна), от ранних к поздним
   * 2. По идентификатору лекции (лексикографически)
   * @param a - первая лекция
   * @param b - вторая лекция
   * @returns результат сравнения для сортировки
   */
  private sortLectures(a: LectureInfo, b: LectureInfo): number {
    // Если у обеих лекций есть даты, сортируем по дате
    if (a.metadata?.date && b.metadata?.date) {
      const dateComparison = a.metadata.date.localeCompare(b.metadata.date);
      if (dateComparison !== 0) {
        return dateComparison;
      }
    }
    
    // Если только у одной есть дата, она идёт первой
    if (a.metadata?.date && !b.metadata?.date) {
      return -1;
    }
    
    if (!a.metadata?.date && b.metadata?.date) {
      return 1;
    }
    
    // Сортируем по ID как fallback для детерминированности
    return a.id.localeCompare(b.id);
  }

  /**
   * Преобразует LectureInfo в запись course index
   * @param lecture - информация о лекции
   * @returns запись для course index
   */
  private async lectureToCourseIndexEntry(lecture: LectureInfo): Promise<CourseIndexLecture> {
    // Если метаданные уже загружены из discovery service, используем их
    if (lecture.metadata) {
      const url = this.buildLectureUrl(lecture.id);
      
      return {
        id: lecture.id,
        title: lecture.metadata.title,
        description: lecture.metadata.description,
        date: lecture.metadata.date,
        url
      };
    }

    // Иначе читаем frontmatter напрямую
    const fileContent = await fs.readFile(lecture.slidesMdPath, "utf-8");
    const parsed = matter(fileContent);
    const metadata = parsed.data;

    const url = this.buildLectureUrl(lecture.id);

    return {
      id: lecture.id,
      title: String(metadata.title || lecture.id).trim(),
      description: metadata.description ? String(metadata.description).trim() : undefined,
      date: metadata.date ? String(metadata.date).trim() : undefined,
      url
    };
  }

  /**
   * Формирует URL путь для лекции
   * @param lectureId - идентификатор лекции
   * @returns URL путь
   */
  private buildLectureUrl(lectureId: string): string {
    const baseUrl = this.config.baseUrl ?? "";
    
    // Убедимся, что baseUrl не заканчивается слэшем, а url начинается со слэша
    const normalizedBase = baseUrl.replace(/\/$/, "");
    const lecturePath = `/${lectureId}`;
    
    return normalizedBase + lecturePath;
  }

  /**
   * Записывает course index в файл в новом формате
   * @param index - данные индекса курса
   * @param outputPath - путь к выходному файлу
   */
  private async writeCourseIndex(index: CourseIndex, outputPath: string): Promise<void> {
    // Создаём выходную директорию, если не существует
    await fs.ensureDir(path.dirname(outputPath));

    // Форматируем JSON с отступом 2 пробела для читаемости
    const jsonContent = JSON.stringify(index, null, 2);
    
    await fs.writeFile(outputPath, jsonContent, "utf-8");
  }

  /**
   * Генерирует course index и записывает в slides.json
   * Псевдоним метода generate() для обратной совместимости
   * @returns результат генерации
   */
  async generateCourseIndex(): Promise<CourseIndexGenerationResult> {
    return this.generate();
  }

  /**
   * Проверяет, требуется ли перегенерация slides.json
   * Сравнивает время модификации slides.json с временем модификации лекций
   * @returns true если перегенерация требуется
   */
  async needsRegeneration(): Promise<boolean> {
    const slidesJsonPath = path.join(this.config.outputDirectory, "slides.json");

    // Если slides.json не существует, требуется генерация
    if (!await fs.pathExists(slidesJsonPath)) {
      return true;
    }

    // Читаем время модификации slides.json
    const slidesJsonStat = await fs.stat(slidesJsonPath);
    const slidesJsonMtime = slidesJsonStat.mtime;

    // Проверяем все лекции
    const discoveryResult = await this.discoveryService.discoverLectures();
    
    for (const lecture of discoveryResult.lectures) {
      // Проверяем slides.md
      if (await fs.pathExists(lecture.slidesMdPath)) {
        const slideMdStat = await fs.stat(lecture.slidesMdPath);
        if (slideMdStat.mtime > slidesJsonMtime) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Получает текущий course index из файла
   * Поддерживает как старый формат ({ slides: [{ name, title }] }), так и новый ({ title, lectures: [...] })
   * @returns данные индекса курса в унифицированном формате или undefined если файл не существует
   */
  async getCurrentIndex(): Promise<CourseIndex | undefined> {
    const slidesJsonPath = path.join(this.config.outputDirectory, "slides.json");

    if (!await fs.pathExists(slidesJsonPath)) {
      return undefined;
    }

    const content = await fs.readFile(slidesJsonPath, "utf-8");
    const parsed = JSON.parse(content) as CourseIndexAny;

    // Проверяем формат и конвертируем при необходимости
    return this.convertToCourseIndex(parsed);
  }

  /**
   * Проверяет, является ли slides.json в старом формате
   * Старый формат: { slides: [{ name, title }] }
   * @param data - распарсенный JSON
   * @returns true если это старый формат
   */
  isLegacyFormat(data: CourseIndexAny): data is LegacyCourseIndex {
    return "slides" in data && Array.isArray((data as LegacyCourseIndex).slides);
  }

  /**
   * Конвертирует старый формат slides.json в новый
   * @param legacy - slides.json в старом формате
   * @returns CourseIndex в новом формате
   */
  convertToCourseIndex(data: CourseIndexAny): CourseIndex {
    // Если уже новый формат, возвращаем как есть
    if ("lectures" in data) {
      return data as CourseIndex;
    }

    // Конвертируем старый формат в новый
    const legacy = data as LegacyCourseIndex;
    const lectures: CourseIndexLecture[] = legacy.slides.map((slide: LegacyCourseIndexLecture) => ({
      id: slide.name,
      title: slide.title,
      url: this.buildLectureUrl(slide.name)
    }));

    return {
      title: this.config.courseTitle,
      lectures
    };
  }

  /**
   * Получает лекции из текущего slides.json в унифицированном формате
   * Поддерживает оба формата (старый и новый)
   * @returns массив лекций или пустой массив если файл не существует
   */
  async getLectures(): Promise<CourseIndexLecture[]> {
    const index = await this.getCurrentIndex();
    return index?.lectures ?? [];
  }

  /**
   * Проверяет, существует ли slides.json и в каком он формате
   * @returns информация о файле slides.json
   */
  async getSlidesJsonInfo(): Promise<{
    exists: boolean;
    format: "new" | "legacy" | "unknown";
    lectureCount: number;
  }> {
    const slidesJsonPath = path.join(this.config.outputDirectory, "slides.json");

    if (!await fs.pathExists(slidesJsonPath)) {
      return { exists: false, format: "unknown", lectureCount: 0 };
    }

    try {
      const content = await fs.readFile(slidesJsonPath, "utf-8");
      const data = JSON.parse(content) as CourseIndexAny;

      if (this.isLegacyFormat(data)) {
        return {
          exists: true,
          format: "legacy",
          lectureCount: data.slides.length
        };
      }

      // Новый формат должен иметь поле title или lectures
      const hasTitle = "title" in data;
      const hasLectures = "lectures" in data;
      
      if (hasTitle || hasLectures) {
        return {
          exists: true,
          format: "new",
          lectureCount: (data as CourseIndex).lectures?.length ?? 0
        };
      }

      return { exists: true, format: "unknown", lectureCount: 0 };
    } catch {
      return { exists: true, format: "unknown", lectureCount: 0 };
    }
  }
}