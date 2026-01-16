/**
 * Метаданные лекции, извлеченные из frontmatter
 * Согласно спецификации, поддерживаемые поля:
 * - title (string, REQUIRED) - человекочитаемое название лекции
 * - description (string, OPTIONAL) - краткое описание лекции  
 * - date (string, OPTIONAL) - дата публикации в формате YYYY-MM-DD
 */
export interface LectureMetadata {
  title: string;
  description?: string;
  date?: string; // YYYY-MM-DD format
}

/**
 * Статус лекции в файловой системе
 */
export enum LectureStatus {
  VALID = "valid",
  INVALID = "invalid",
  MISSING_SLIDES_MD = "missing_slides_md",
  INVALID_FRONTMATTER = "invalid_frontmatter"
}

/**
 * Информация о лекции, обнаруженной в файловой системе
 */
export interface LectureInfo {
  id: string; // имя директории
  path: string; // абсолютный путь к директории лекции
  slidesMdPath: string; // абсолютный путь к slides.md
  metadata?: LectureMetadata;
  status: LectureStatus;
  error?: string; // описание ошибки, если есть
}

/**
 * Результат сканирования директории с лекциями
 */
export interface DiscoveryResult {
  lectures: LectureInfo[];
  totalFound: number;
  validLectures: number;
  errors: string[];
}

/**
 * Результат валидации отдельной лекции
 */
export interface ValidationResult {
  isValid: boolean;
  status: LectureStatus;
  metadata?: LectureMetadata;
  error?: string;
}