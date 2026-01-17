/**
 * Конфигурация окружения лекции
 */
export interface LectureEnvironmentConfig {
  /** Путь к директории лекции */
  lecturePath: string;
  
  /** Идентификатор лекции */
  lectureId: string;
  
  /** Версия slidev для установки */
  slidevVersion?: string;
  
  /** Использовать глобально установленный slidev */
  useGlobalSlidev?: boolean;
}

/**
 * Статус окружения лекции
 */
export enum EnvironmentStatus {
  NOT_INITIALIZED = "not_initialized",
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error",
  INSTALLING = "installing"
}

/**
 * Информация об окружении лекции
 */
export interface EnvironmentInfo {
  /** Статус окружения */
  status: EnvironmentStatus;
  
  /** Путь к директории лекции */
  lecturePath: string;
  
  /** Путь к package.json лекции */
  packageJsonPath: string;
  
  /** Путь к node_modules */
  nodeModulesPath: string;
  
  /** Версия slidev */
  slidevVersion?: string;
  
  /** Путь к скомпилированным слайдам */
  slidesPath?: string;
  
  /** Ошибка, если статус ERROR */
  error?: string;
}

/**
 * Результат инициализации окружения
 */
export interface EnvironmentInitResult {
  /** Успешность операции */
  success: boolean;
  
  /** Информация об окружении */
  environment: EnvironmentInfo;
  
  /** Сообщения (лог установки) */
  messages: string[];
  
  /** Ошибки, если есть */
  errors: string[];
}

/**
 * Результат установки зависимостей
 */
export interface InstallResult {
  /** Успешность операции */
  success: boolean;
  
  /** Установленные пакеты */
  installedPackages: string[];
  
  /** Сообщения */
  messages: string[];
  
  /** Ошибки */
  errors: string[];
}

/**
 * Конфигурация для dev server
 */
export interface DevServerConfig {
  /** Путь к директории лекции */
  lecturePath: string;
  
  /** Порт для dev server */
  port?: number;
  
  /** Хост для dev server */
  host?: string;
  
  /** Открывать ли браузер автоматически */
  openBrowser?: boolean;
  
  /** Дополнительные аргументы slidev */
  extraArgs?: string[];
}

/**
 * Результат запуска dev server
 */
export interface DevServerResult {
  /** Успешность запуска */
  success: boolean;
  
  /** URL для доступа к презентации */
  url?: string;
  
  /** PID процесса */
  processId?: number;
  
  /** Сообщения */
  messages: string[];
  
  /** Ошибки */
  errors: string[];
}

/**
 * Результат сборки лекции
 */
export interface BuildResult {
  /** Успешность сборки */
  success: boolean;
  
  /** Путь к скомпилированным файлам */
  outputPath?: string;
  
  /** Сообщения */
  messages: string[];
  
  /** Ошибки */
  errors: string[];
}