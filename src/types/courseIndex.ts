/**
 * Запись лекции в course index (новый формат)
 * Согласно спецификации: содержит идентификатор, метаданные и путь URL
 */
export interface CourseIndexLecture {
  /** Идентификатор лекции (совпадает с именем директории) */
  id: string;
  
  /** Человекочитаемое название лекции (из frontmatter) */
  title: string;
  
  /** Краткое описание лекции (опционально) */
  description?: string;
  
  /** Дата публикации в формате YYYY-MM-DD (опционально) */
  date?: string;
  
  /** URL путь внутри курса (например, /lecture-1) */
  url: string;
}

/**
 * Course index - структура файла slides.json (новый формат)
 * Согласно спецификации: машиночитаемый индекс курса для статического сайта
 */
export interface CourseIndex {
  /** Название курса */
  title: string;
  
  /** Упорядоченный список лекций */
  lectures: CourseIndexLecture[];
}

/**
 * Запись лекции в старом формате slides.json
 */
export interface LegacyCourseIndexLecture {
  /** Идентификатор лекции (name = id директории) */
  name: string;
  
  /** Название лекции */
  title: string;
}

/**
 * Course index - структура файла slides.json (старый формат)
 */
export interface LegacyCourseIndex {
  /** Список лекций в старом формате */
  slides: LegacyCourseIndexLecture[];
}

/**
 * Универсальный тип для поддержки обоих форматов slides.json
 */
export type CourseIndexAny = CourseIndex | LegacyCourseIndex;

/**
 * Конфигурация генератора course index
 */
export interface CourseIndexGeneratorConfig {
  /** Название курса для включения в slides.json */
  courseTitle: string;
  
  /** Путь к директории с исходниками лекций (slides/) */
  slidesDirectory: string;
  
  /** Путь к выходной директории курса */
  outputDirectory: string;
  
  /** Базовый URL для формирования путей лекций */
  baseUrl?: string;
}

/**
 * Результат генерации course index
 */
export interface CourseIndexGenerationResult {
  /** Сгенерированный индекс курса */
  index: CourseIndex;
  
  /** Путь к созданному файлу slides.json */
  outputPath: string;
  
  /** Количество обработанных лекций */
  processedLectures: number;
  
  /** Ошибки, возникшие при генерации */
  errors: string[];
  
  /** Успешность генерации */
  success: boolean;
}