import * as path from "path";
import * as fs from "fs-extra";
import * as os from "os";
import { execSync, spawn, ChildProcess } from "child_process";
import {
  LectureEnvironmentConfig,
  EnvironmentStatus,
  EnvironmentInfo,
  EnvironmentInitResult,
  InstallResult,
  DevServerConfig,
  DevServerResult,
  BuildResult
} from "../types/environment";

/**
 * Интерфейс для отслеживания активных процессов
 */
interface ActiveProcess {
  process: ChildProcess;
  type: "dev" | "build";
  lectureId: string;
  startTime: Date;
}

/**
 * Сервис для управления Node.js окружением лекций Slidev
 * 
 * Функциональность:
 * - Инициализация Node.js проекта в директории лекции
 * - Локальная установка slidev с изоляцией зависимостей
 * - Управление dev server для разработки
 * - Сборка статических файлов презентации
 */
export class LectureEnvironmentManager {
  private config: LectureEnvironmentConfig;
  private environment: EnvironmentInfo;
  private activeProcesses: Map<string, ActiveProcess> = new Map();
  
  constructor(config: LectureEnvironmentConfig) {
    this.config = config;
    this.environment = this.createEmptyEnvironment();
  }

  /**
   * Создает пустую структуру окружения
   */
  private createEmptyEnvironment(): EnvironmentInfo {
    const lecturePath = path.resolve(this.config.lecturePath);
    return {
      status: EnvironmentStatus.NOT_INITIALIZED,
      lecturePath,
      packageJsonPath: path.join(lecturePath, "package.json"),
      nodeModulesPath: path.join(lecturePath, "node_modules")
    };
  }

  /**
   * Инициализирует Node.js окружение в директории лекции
   * Создает package.json с необходимыми зависимостями
   */
  async initialize(): Promise<EnvironmentInitResult> {
    const result: EnvironmentInitResult = {
      success: false,
      environment: this.environment,
      messages: [],
      errors: []
    };

    try {
      this.updateStatus(EnvironmentStatus.INITIALIZING);
      result.messages.push(`Initializing environment for lecture: ${this.config.lectureId}`);

      // Проверяем существование директории лекции
      if (!(await fs.pathExists(this.environment.lecturePath))) {
        throw new Error(`Lecture directory does not exist: ${this.environment.lecturePath}`);
      }

      // Проверяем существование slides.md
      const slidesMdPath = path.join(this.environment.lecturePath, "slides.md");
      if (!(await fs.pathExists(slidesMdPath))) {
        throw new Error(`slides.md not found in lecture directory: ${slidesMdPath}`);
      }

      // Создаем или обновляем package.json
      const packageJsonResult = await this.ensurePackageJson();
      if (!packageJsonResult.success) {
        throw new Error(`Failed to create package.json: ${packageJsonResult.errors.join(", ")}`);
      }
      result.messages.push(...packageJsonResult.messages);

      // Обновляем информацию об окружении
      this.environment.slidevVersion = packageJsonResult.slidevVersion;
      this.updateStatus(EnvironmentStatus.READY);
      
      result.success = true;
      result.environment = this.environment;
      result.messages.push("Environment initialized successfully");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus(EnvironmentStatus.ERROR, errorMessage);
      result.errors.push(errorMessage);
      result.environment = this.environment;
    }

    return result;
  }

  /**
   * Создает или обновляет package.json для лекции
   */
  private async ensurePackageJson(): Promise<{
    success: boolean;
    slidevVersion?: string;
    messages: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      slidevVersion: undefined as string | undefined,
      messages: [] as string[],
      errors: [] as string[]
    };

    try {
      const packageJsonPath = this.environment.packageJsonPath;
      let packageJson: any = {};
      let existingVersion: string | undefined;

      // Пытаемся прочитать существующий package.json
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const content = await fs.readFile(packageJsonPath, "utf-8");
          packageJson = JSON.parse(content);
          result.messages.push("Found existing package.json");

          // Проверяем версию slidev
          if (packageJson.dependencies?.["@slidev/core"] || packageJson.devDependencies?.["@slidev/core"]) {
            existingVersion = packageJson.dependencies?.["@slidev/core"] || 
                            packageJson.devDependencies?.["@slidev/core"];
            result.messages.push(`Existing slidev version: ${existingVersion}`);
          }
        } catch (parseError) {
          result.errors.push(`Failed to parse existing package.json: ${parseError}`);
          // Создаем новый package.json
          packageJson = {};
        }
      }

      // Определяем версию slidev
      const slidevVersion = this.config.slidevVersion || existingVersion || "^0.49.0";
      result.slidevVersion = slidevVersion.replace("^", "").replace("~", "");

      // Обновляем или создаем структуру package.json
      packageJson = this.buildPackageJson(packageJson, slidevVersion);

      // Записываем package.json
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      result.messages.push(`Created/updated package.json with slidev@${slidevVersion}`);

      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to create package.json: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Строит структуру package.json для лекции
   */
  private buildPackageJson(existing: any, slidevVersion: string): any {
    // Базовая структура package.json
    const packageJson = {
      name: `slidev-lecture-${this.config.lectureId}`,
      version: "1.0.0",
      private: true,
      scripts: {
        "slidev": "slidev",
        "dev": "slidev",
        "build": "slidev build",
        "export": "slidev export"
      },
      dependencies: {},
      devDependencies: {}
    };

    // Сохраняем существующие зависимости
    if (existing.dependencies) {
      packageJson.dependencies = { ...existing.dependencies } as Record<string, string>;
    }
    if (existing.devDependencies) {
      packageJson.devDependencies = { ...existing.devDependencies } as Record<string, string>;
    }

    // Добавляем/обновляем slidev
    (packageJson.devDependencies as Record<string, string>)["@slidev/core"] = slidevVersion;
    
    // Добавляем обязательные зависимости slidev
    (packageJson.dependencies as Record<string, string>)["@slidev/client"] = slidevVersion;

    // Удаляем @slidev/theme-default если есть (будет добавлен автоматически)
    delete (packageJson.devDependencies as Record<string, string>)["@slidev/theme-default"];

    return packageJson;
  }

  /**
   * Устанавливает зависимости для лекции (выполняет npm install)
   */
  async installDependencies(): Promise<InstallResult> {
    const result: InstallResult = {
      success: false,
      installedPackages: [],
      messages: [],
      errors: []
    };

    try {
      this.updateStatus(EnvironmentStatus.INSTALLING);
      result.messages.push("Installing dependencies...");

      // Проверяем, что package.json существует
      if (!(await fs.pathExists(this.environment.packageJsonPath))) {
        throw new Error("package.json not found. Call initialize() first.");
      }

      // Выполняем установку зависимостей
      const installResult = await this.runPackageManager(["install"], this.environment.lecturePath);
      
      if (!installResult.success) {
        throw new Error(`Installation failed: ${installResult.errors.join(", ")}`);
      }

      result.messages.push(...installResult.messages);
      result.installedPackages = ["@slidev/core", "@slidev/client"];
      
      // Обновляем путь к node_modules
      this.environment.nodeModulesPath = path.join(this.environment.lecturePath, "node_modules");
      
      this.updateStatus(EnvironmentStatus.READY);
      result.success = true;
      result.messages.push("Dependencies installed successfully");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus(EnvironmentStatus.ERROR, errorMessage);
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Выполняет синхронную установку зависимостей (для использования в продакшене)
   * @param silent - не выводить сообщения в stdout
   * @returns результат установки
   */
  async installDependenciesSync(silent: boolean = false): Promise<InstallResult> {
    const result: InstallResult = {
      success: false,
      installedPackages: [],
      messages: [],
      errors: []
    };

    try {
      this.updateStatus(EnvironmentStatus.INSTALLING);
      
      // Определяем пакетный менеджер
      const packageManager = await this.detectPackageManager();
      result.messages.push(`Using package manager: ${packageManager}`);

      // Выполняем установку
      const packageManagerCmd = packageManager === "pnpm" ? "pnpm" : "npm";
      const args = packageManager === "pnpm" 
        ? ["install", "--frozen-lockfile", "--prefer-offline"]
        : ["install", "--prefer-offline", "--no-audit", "--no-fund"];

      if (!silent) {
        result.messages.push(`Running: ${packageManagerCmd} ${args.join(" ")}`);
      }

      // Выполняем синхронно
      execSync(`${packageManagerCmd} ${args.join(" ")}`, {
        cwd: this.environment.lecturePath,
        encoding: "utf-8",
        stdio: silent ? "pipe" : "inherit",
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer для больших проектов
        timeout: 300000 // 5 минут timeout
      });

      result.messages.push("Dependencies installed successfully");
      result.installedPackages = ["@slidev/core", "@slidev/client"];
      
      // Обновляем путь к node_modules
      this.environment.nodeModulesPath = path.join(this.environment.lecturePath, "node_modules");
      
      this.updateStatus(EnvironmentStatus.READY);
      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus(EnvironmentStatus.ERROR, errorMessage);
      result.errors.push(errorMessage);
      
      // Добавляем дополнительную информацию об ошибке
      if (error instanceof Error && "status" in error) {
        result.errors.push(`Exit code: ${(error as any).status}`);
      }
    }

    return result;
  }

  /**
   * Запускает dev server для лекции (в фоновом режиме)
   */
  async startDevServer(config: DevServerConfig): Promise<DevServerResult> {
    const result: DevServerResult = {
      success: false,
      messages: [],
      errors: []
    };

    try {
      result.messages.push(`Starting dev server for lecture: ${this.config.lectureId}`);

      // Проверяем, что окружение инициализировано
      if (this.environment.status !== EnvironmentStatus.READY) {
        throw new Error("Environment not ready. Call initialize() first.");
      }

      // Проверяем наличие node_modules
      if (!(await fs.pathExists(this.environment.nodeModulesPath))) {
        result.messages.push("node_modules not found, installing dependencies...");
        const installResult = await this.installDependencies();
        if (!installResult.success) {
          throw new Error(`Failed to install dependencies: ${installResult.errors.join(", ")}`);
        }
      }

      // Останавливаем существующий dev server для этой лекции
      await this.stopDevServer();

      // Формируем аргументы для slidev
      const packageManager = await this.detectPackageManager();
      const port = config.port || 3030;
      const host = config.host || "localhost";
      
      // Формируем команду в зависимости от пакетного менеджера
      const command = packageManager === "pnpm" ? "pnpm" : "npm";
      const slidevArgs = packageManager === "pnpm" 
        ? ["--filter", `slidev-lecture-${this.config.lectureId}`, "run", "dev", "--", `--port=${port}`, `--host=${host}`]
        : ["run", "dev", `--`, `--port=${port}`, `--host=${host}`];

      if (!config.openBrowser) {
        slidevArgs.push("--no-open");
      }
      
      if (config.extraArgs) {
        slidevArgs.push(...config.extraArgs);
      }

      result.messages.push(`Running: ${command} ${slidevArgs.join(" ")}`);

      // Запускаем процесс в фоновом режиме
      const childProcess = spawn(command, slidevArgs, {
        cwd: this.environment.lecturePath,
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          NODE_ENV: "development",
          PORT: port.toString(),
          HOST: host
        }
      });

      const processKey = `${this.config.lectureId}-dev`;
      
      // Сохраняем процесс для возможности остановки
      this.activeProcesses.set(processKey, {
        process: childProcess,
        type: "dev",
        lectureId: this.config.lectureId,
        startTime: new Date()
      });

      // Обрабатываем вывод процесса
      let stdout = "";
      let stderr = "";

      childProcess.stdout?.on("data", (data) => {
        const text = data.toString();
        stdout += text;
        result.messages.push(text);
      });

      childProcess.stderr?.on("data", (data) => {
        const text = data.toString();
        stderr += text;
        result.errors.push(text);
      });

      // Ожидаем запуска сервера или ошибки
      const launched = await this.waitForServerStart(childProcess, port, host);
      
      if (launched) {
        result.url = `http://${host}:${port}`;
        result.processId = childProcess.pid;
        result.success = true;
        result.messages.push(`Dev server started at ${result.url} (PID: ${childProcess.pid})`);
      } else {
        // Проверяем, завершился ли процесс с ошибкой
        if (childProcess.exitCode !== null && childProcess.exitCode !== 0) {
          throw new Error(`Dev server exited with code ${childProcess.exitCode}. stderr: ${stderr}`);
        }
        // Если сервер не запустился, но процесс еще работает, считаем успехом
        result.url = `http://${host}:${port}`;
        result.processId = childProcess.pid;
        result.success = true;
        result.messages.push(`Dev server started at ${result.url} (PID: ${childProcess.pid})`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      // Очищаем процесс при ошибке
      this.stopDevServer();
    }

    return result;
  }

  /**
   * Ожидает запуска сервера, проверяя вывод процесса
   */
  private async waitForServerStart(
    process: ChildProcess, 
    port: number, 
    host: string,
    timeout: number = 30000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false;
      let checkCount = 0;
      const maxChecks = timeout / 500;

      const checkInterval = setInterval(() => {
        checkCount++;
        
        // Проверяем, не завершился ли процесс
        if (process.exitCode !== null) {
          clearInterval(checkInterval);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
          return;
        }

        // Проверяем, открыт ли порт
        try {
          const net = require("net");
          const socket = new net.Socket();
          socket.setTimeout(1000);
          
          socket.on("connect", () => {
            socket.destroy();
            clearInterval(checkInterval);
            if (!resolved) {
              resolved = true;
              resolve(true);
            }
          });
          
          socket.on("timeout", () => {
            socket.destroy();
          });
          
          socket.on("error", () => {
            // Порт еще не открыт, продолжаем проверку
          });
          
          socket.connect(port, host);
        } catch {
          // Ошибка проверки порта, продолжаем
        }

        // Timeout
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        }
      }, 500);
    });
  }

  /**
   * Останавливает dev server для текущей лекции
   */
  async stopDevServer(): Promise<boolean> {
    const processKey = `${this.config.lectureId}-dev`;
    const activeProcess = this.activeProcesses.get(processKey);

    if (activeProcess) {
      const childProcess = activeProcess.process;

      // Пытаемся корректно завершить процесс
      if (!childProcess.killed) {
        try {
          // Windows: использовать taskkill
          if (global.process.platform === "win32") {
            execSync(`taskkill /PID ${childProcess.pid} /F /T`, { encoding: "utf-8", stdio: "ignore" });
          } else {
            childProcess.kill("SIGTERM");
          }
        } catch {
          // Если SIGTERM не сработал, используем SIGKILL
          try {
            if (global.process.platform !== "win32") {
              childProcess.kill("SIGKILL");
            }
          } catch {
            // Игнорируем ошибки при убийстве процесса
          }
        }
      }

      this.activeProcesses.delete(processKey);
      return true;
    }

    return false;
  }

  /**
   * Проверяет, запущен ли dev server для лекции
   */
  isDevServerRunning(): boolean {
    const processKey = `${this.config.lectureId}-dev`;
    const activeProcess = this.activeProcesses.get(processKey);
    return activeProcess !== undefined && activeProcess.process.exitCode === null;
  }

  /**
   * Получает PID запущенного dev server
   */
  getDevServerPid(): number | undefined {
    const processKey = `${this.config.lectureId}-dev`;
    const activeProcess = this.activeProcesses.get(processKey);
    return activeProcess?.process.pid;
  }

  /**
   * Собирает лекцию в статические файлы
   */
  async buildLecture(): Promise<BuildResult> {
    const result: BuildResult = {
      success: false,
      messages: [],
      errors: []
    };

    try {
      result.messages.push(`Building lecture: ${this.config.lectureId}`);

      // Проверяем, что окружение инициализировано
      if (this.environment.status !== EnvironmentStatus.READY) {
        throw new Error("Environment not ready. Call initialize() first.");
      }

      // Проверяем наличие node_modules
      if (!(await fs.pathExists(this.environment.nodeModulesPath))) {
        result.messages.push("node_modules not found, installing dependencies...");
        const installResult = await this.installDependencies();
        if (!installResult.success) {
          throw new Error(`Failed to install dependencies: ${installResult.errors.join(", ")}`);
        }
      }

      // Определяем пакетный менеджер
      const packageManager = await this.detectPackageManager();
      
      // Формируем команду для сборки
      const command = packageManager === "pnpm" ? "pnpm" : "npm";
      const buildArgs = packageManager === "pnpm"
        ? ["--filter", `slidev-lecture-${this.config.lectureId}`, "run", "build"]
        : ["run", "build"];

      result.messages.push(`Running: ${command} ${buildArgs.join(" ")}`);

      // Выполняем сборку синхронно
      try {
        execSync(`${command} ${buildArgs.join(" ")}`, {
          cwd: this.environment.lecturePath,
          encoding: "utf-8",
          stdio: "pipe",
          maxBuffer: 100 * 1024 * 1024, // 100MB buffer
          timeout: 300000 // 5 минут timeout
        });

        result.messages.push("Build completed successfully");
      } catch (buildError) {
        const errorMessage = buildError instanceof Error ? buildError.message : String(buildError);
        
        // Пытаемся получить stderr из error output
        if (buildError instanceof Error && "stderr" in buildError) {
          result.errors.push(`Build stderr: ${(buildError as any).stderr}`);
        }
        
        throw new Error(`Build failed: ${errorMessage}`);
      }

      // Определяем путь к собранным файлам
      const distPath = path.join(this.environment.lecturePath, "dist");
      
      if (await fs.pathExists(distPath)) {
        // Проверяем, что dist не пустой
        const distContents = await fs.readdir(distPath);
        if (distContents.length > 0) {
          result.outputPath = distPath;
          result.messages.push(`Build output: ${distPath}`);
          result.messages.push(`Output files: ${distContents.join(", ")}`);
        } else {
          result.messages.push("Warning: dist directory is empty");
        }
      } else {
        result.messages.push("Warning: dist directory not found after build");
      }

      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      
      // Добавляем информацию об exit code
      if (error instanceof Error && "status" in error) {
        result.errors.push(`Exit code: ${(error as any).status}`);
      }
    }

    return result;
  }

  /**
   * Собирает лекцию с выводом в реальном времени (для отладки)
   */
  async buildLectureWithOutput(): Promise<BuildResult> {
    const result: BuildResult = {
      success: false,
      messages: [],
      errors: []
    };

    try {
      result.messages.push(`Building lecture: ${this.config.lectureId}`);

      // Проверяем, что окружение инициализировано
      if (this.environment.status !== EnvironmentStatus.READY) {
        throw new Error("Environment not ready. Call initialize() first.");
      }

      // Проверяем наличие node_modules
      if (!(await fs.pathExists(this.environment.nodeModulesPath))) {
        result.messages.push("node_modules not found, installing dependencies...");
        const installResult = await this.installDependencies();
        if (!installResult.success) {
          throw new Error(`Failed to install dependencies: ${installResult.errors.join(", ")}`);
        }
      }

      // Определяем пакетный менеджер
      const packageManager = await this.detectPackageManager();
      
      // Формируем команду для сборки
      const command = packageManager === "pnpm" ? "pnpm" : "npm";
      const buildArgs = packageManager === "pnpm"
        ? ["--filter", `slidev-lecture-${this.config.lectureId}`, "run", "build"]
        : ["run", "build"];

      result.messages.push(`Running: ${command} ${buildArgs.join(" ")}`);

      // Запускаем сборку с выводом в реальном времени
      const childProcess = spawn(command, buildArgs, {
        cwd: this.environment.lecturePath,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NODE_ENV: "production" }
      });

      return new Promise<BuildResult>((resolve) => {
        let resolved = false;

        const handleOutput = (data: Buffer, stream: "stdout" | "stderr") => {
          const text = data.toString();
          const lines = text.split("\n").filter(l => l.trim());
          
          lines.forEach(line => {
            const prefix = stream === "stderr" ? "[error]" : "[info]";
            const message = `${prefix} ${line}`;
            
            if (stream === "stderr") {
              result.errors.push(message);
            } else {
              result.messages.push(message);
            }
          });
        };

        childProcess.stdout?.on("data", (data) => handleOutput(data, "stdout"));
        childProcess.stderr?.on("data", (data) => handleOutput(data, "stderr"));

        childProcess.on("close", (code) => {
          if (resolved) return;
          resolved = true;

          if (code === 0) {
            result.messages.push("Build completed successfully");
            result.success = true;
          } else {
            result.errors.push(`Build exited with code ${code}`);
            result.success = false;
          }

          // Определяем путь к собранным файлам
          const distPath = path.join(this.environment.lecturePath, "dist");
          
          if (result.success && fs.existsSync(distPath)) {
            const distContents = fs.readdirSync(distPath);
            if (distContents.length > 0) {
              result.outputPath = distPath;
              result.messages.push(`Build output: ${distPath}`);
            }
          }

          resolve(result);
        });

        childProcess.on("error", (error) => {
          if (resolved) return;
          resolved = true;
          result.errors.push(`Process error: ${error.message}`);
          result.success = false;
          resolve(result);
        });

        // Timeout для сборки
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            childProcess.kill("SIGTERM");
            result.errors.push("Build timeout (5 minutes)");
            result.success = false;
            resolve(result);
          }
        }, 300000);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      return result;
    }
  }

  /**
   * Выполняет команду пакетного менеджера (npm/pnpm)
   */
  private async runPackageManager(args: string[], workingDir: string): Promise<{
    success: boolean;
    messages: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      messages: [] as string[],
      errors: [] as string[]
    };

    try {
      // Пытаемся использовать pnpm, затем npm
      const packageManager = await this.detectPackageManager();
      result.messages.push(`Using package manager: ${packageManager}`);

      const fullArgs = packageManager === "pnpm" 
        ? ["install", ...args.filter(a => a !== "install")] 
        : ["install", ...args.filter(a => a !== "install")];

      // Выполняем реальную установку
      result.messages.push(`Running: ${packageManager} ${fullArgs.join(" ")}`);

      execSync(`${packageManager} ${fullArgs.join(" ")}`, {
        cwd: workingDir,
        encoding: "utf-8",
        stdio: "pipe",
        maxBuffer: 50 * 1024 * 1024
      });

      result.success = true;
      result.messages.push("Dependencies installed successfully");

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Пытаемся получить stderr
      if (error instanceof Error && "stderr" in error) {
        result.errors.push(`stderr: ${(error as any).stderr}`);
      }
      
      result.errors.push(`Package manager failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Выполняет команду slidev
   */
  private async runSlidevCommand(args: string[]): Promise<{
    success: boolean;
    messages: string[];
    errors: string[];
  }> {
    const result = {
      success: false,
      messages: [] as string[],
      errors: [] as string[]
    };

    try {
      // Проверяем, какой package manager использовать
      const packageManager = await this.detectPackageManager();
      
      // Формируем команду для запуска slidev
      // Используем npx для запуска локально установленного slidev
      const slidevArgs = packageManager === "pnpm" 
        ? ["exec", "slidev", ...args] 
        : ["exec", "slidev", ...args];

      result.messages.push(`Running: ${packageManager} ${slidevArgs.join(" ")}`);

      // Выполняем команду
      execSync(`${packageManager} ${slidevArgs.join(" ")}`, {
        cwd: this.environment.lecturePath,
        encoding: "utf-8",
        stdio: "pipe",
        maxBuffer: 50 * 1024 * 1024
      });

      result.success = true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Пытаемся получить stderr
      if (error instanceof Error && "stderr" in error) {
        result.errors.push(`stderr: ${(error as any).stderr}`);
      }
      
      result.errors.push(`Slidev command failed: ${errorMessage}`);
    }

    return result;
  }

  /**
   * Определяет доступный пакетный менеджер
   */
  private async detectPackageManager(): Promise<string> {
    // Проверяем наличие pnpm
    try {
      const { execSync } = require("child_process");
      execSync("pnpm --version", { encoding: "utf-8", stdio: "ignore" });
      return "pnpm";
    } catch {
      // Проверяем наличие npm
      try {
        const { execSync } = require("child_process");
        execSync("npm --version", { encoding: "utf-8", stdio: "ignore" });
        return "npm";
      } catch {
        return "npm"; // По умолчанию npm
      }
    }
  }

  /**
   * Обновляет статус окружения
   */
  private updateStatus(status: EnvironmentStatus, error?: string): void {
    this.environment.status = status;
    if (error) {
      this.environment.error = error;
    }
  }

  /**
   * Получает текущую информацию об окружении
   */
  getEnvironmentInfo(): EnvironmentInfo {
    return { ...this.environment };
  }

  /**
   * Проверяет, готово ли окружение
   */
  isReady(): boolean {
    return this.environment.status === EnvironmentStatus.READY;
  }

  /**
   * Полный цикл: инициализация + установка зависимостей
   */
  async setup(): Promise<EnvironmentInitResult> {
    const initResult = await this.initialize();
    
    if (!initResult.success) {
      return initResult;
    }

    // Устанавливаем зависимости
    const installResult = await this.installDependencies();
    
    if (!installResult.success) {
      return {
        success: false,
        environment: this.environment,
        messages: initResult.messages,
        errors: installResult.errors
      };
    }

    return {
      success: true,
      environment: this.environment,
      messages: [...initResult.messages, ...installResult.messages],
      errors: []
    };
  }

  /**
   * Останавливает все активные процессы для этой лекции
   */
  async stopAllProcesses(): Promise<void> {
    // Останавливаем dev server
    await this.stopDevServer();
  }

  /**
   * Получает статус всех активных процессов
   */
  getActiveProcesses(): Array<{ type: string; lectureId: string; pid?: number; uptime: number }> {
    const processes: Array<{ type: string; lectureId: string; pid?: number; uptime: number }> = [];

    this.activeProcesses.forEach((proc, key) => {
      const uptime = proc.startTime ? Date.now() - proc.startTime.getTime() : 0;
      processes.push({
        type: proc.type,
        lectureId: proc.lectureId,
        pid: proc.process.pid,
        uptime: Math.floor(uptime / 1000)
      });
    });

    return processes;
  }

  /**
   * Статический метод для остановки всех процессов всех менеджеров
   * Используется при деактивации расширения
   */
  static stopAllActiveProcesses(): void {
    // Этот метод должен вызываться из extension.ts при деактивации
    // Для этого можно использовать глобальный список активных менеджеров
    // или событийную систему
  }
}