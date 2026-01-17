/**
 * Метаданные лекции, извлеченные из frontmatter
 * Согласно спецификации SPEC.md, поддерживаемые поля:
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
 * Результат парсинга frontmatter
 */
export interface FrontmatterParseResult {
  isValid: boolean;
  metadata?: LectureMetadata;
  errors: string[];
}

/**
 * Ошибки валидации frontmatter
 */
export enum FrontmatterValidationError {
  NO_FRONTMATTER = "No frontmatter found in file",
  EMPTY_FRONTMATTER = "Frontmatter is empty",
  MISSING_TITLE = "Required field 'title' is missing",
  EMPTY_TITLE = "Field 'title' is empty",
  INVALID_DATE_FORMAT = "Field 'date' has invalid format (expected YYYY-MM-DD)",
  INVALID_DATE_VALUE = "Field 'date' has invalid date value",
  PARSE_ERROR = "Failed to parse frontmatter"
}

/**
 * Типы данных, поддерживаемые в frontmatter
 */
export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FrontmatterValue[]
  | { [key: string]: FrontmatterValue };