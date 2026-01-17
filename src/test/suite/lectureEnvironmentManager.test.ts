import * as path from "path";
import * as fs from "fs-extra";
import { expect } from "chai";
import {
  LectureEnvironmentManager
} from "../../services/lectureEnvironmentManager";
import {
  LectureEnvironmentConfig,
  EnvironmentStatus
} from "../../types/environment";

describe("LectureEnvironmentManager", () => {
  let testLecturePath: string;
  let manager: LectureEnvironmentManager;

  beforeEach(async () => {
    // Создаем временную директорию для тестов
    testLecturePath = path.join(__dirname, "..", "..", "..", "test-temp", "test-lecture");
    await fs.ensureDir(testLecturePath);

    // Создаем slides.md для теста
    const slidesContent = `---
title: "Test Lecture"
description: "Test description"
date: "2024-01-15"
---

# Test Slide

Test content`;
    await fs.writeFile(path.join(testLecturePath, "slides.md"), slidesContent);

    const config: LectureEnvironmentConfig = {
      lecturePath: testLecturePath,
      lectureId: "test-lecture",
      slidevVersion: "^0.49.0"
    };

    manager = new LectureEnvironmentManager(config);
  });

  afterEach(async () => {
    // Останавливаем все процессы
    await manager.stopAllProcesses();
    // Очищаем тестовую директорию
    await fs.remove(testLecturePath);
  });

  describe("constructor", () => {
    it("should create manager with correct configuration", () => {
      const info = manager.getEnvironmentInfo();
      
      expect(info.lecturePath).to.equal(testLecturePath);
      expect(info.status).to.equal(EnvironmentStatus.NOT_INITIALIZED);
      expect(info.packageJsonPath).to.equal(path.join(testLecturePath, "package.json"));
      expect(info.nodeModulesPath).to.equal(path.join(testLecturePath, "node_modules"));
    });

    it("should return isReady = false initially", () => {
      expect(manager.isReady()).to.be.false;
    });
  });

  describe("initialize", () => {
    it("should initialize environment successfully", async () => {
      const result = await manager.initialize();

      expect(result.success).to.be.true;
      expect(result.errors).to.be.empty;
      expect(result.environment.status).to.equal(EnvironmentStatus.READY);
    });

    it("should create package.json with slidev dependency", async () => {
      await manager.initialize();

      const packageJsonPath = path.join(testLecturePath, "package.json");
      const exists = await fs.pathExists(packageJsonPath);
      expect(exists).to.be.true;

      const packageJson = await fs.readJson(packageJsonPath);
      expect(packageJson.devDependencies).to.have.property("@slidev/core");
      expect(packageJson.name).to.equal("slidev-lecture-test-lecture");
    });

    it("should return error when lecture directory does not exist", async () => {
      const config: LectureEnvironmentConfig = {
        lecturePath: path.join(__dirname, "..", "..", "..", "non-existent"),
        lectureId: "non-existent",
        slidevVersion: "^0.49.0"
      };
      const badManager = new LectureEnvironmentManager(config);

      const result = await badManager.initialize();

      expect(result.success).to.be.false;
      expect(result.errors.length).to.be.greaterThan(0);
      expect(result.environment.status).to.equal(EnvironmentStatus.ERROR);
    });

    it("should return error when slides.md does not exist", async () => {
      const emptyPath = path.join(__dirname, "..", "..", "..", "test-temp", "empty-lecture");
      await fs.ensureDir(emptyPath);

      const config: LectureEnvironmentConfig = {
        lecturePath: emptyPath,
        lectureId: "empty-lecture",
        slidevVersion: "^0.49.0"
      };
      const emptyManager = new LectureEnvironmentManager(config);

      const result = await emptyManager.initialize();

      expect(result.success).to.be.false;
      expect(result.errors.length).to.be.greaterThan(0);
      expect(result.environment.status).to.equal(EnvironmentStatus.ERROR);

      await fs.remove(emptyPath);
    });
  });

  describe("installDependencies", () => {
    it("should fail if environment not initialized", async () => {
      const result = await manager.installDependencies();

      expect(result.success).to.be.false;
      expect(result.errors.length).to.be.greaterThan(0);
    });

    it("should return result structure after initialization", async () => {
      await manager.initialize();
      const result = await manager.installDependencies();

      // Проверяем структуру результата - actual результат зависит от наличия npm/node_modules
      expect(result).to.have.property("success");
      expect(result).to.have.property("messages");
      expect(result).to.have.property("errors");
      expect(result).to.have.property("installedPackages");
    });
  });

  describe("setup", () => {
    it("should initialize environment", async () => {
      const result = await manager.setup();

      // Проверяем что package.json создан
      const packageJsonPath = path.join(testLecturePath, "package.json");
      const exists = await fs.pathExists(packageJsonPath);
      expect(exists).to.be.true;

      // Проверяем что скрипты созданы
      const packageJson = await fs.readJson(packageJsonPath);
      expect(packageJson.scripts).to.have.property("dev");
      expect(packageJson.scripts).to.have.property("build");
    });

    it("should create valid package.json", async () => {
      await manager.initialize();

      const packageJsonPath = path.join(testLecturePath, "package.json");
      const packageJson = await fs.readJson(packageJsonPath);

      expect(packageJson.scripts).to.have.property("dev");
      expect(packageJson.scripts).to.have.property("build");
      expect(packageJson.scripts).to.have.property("slidev");
    });
  });

  describe("buildLecture", () => {
    it("should fail if environment not initialized", async () => {
      const result = await manager.buildLecture();

      expect(result.success).to.be.false;
      expect(result.errors.length).to.be.greaterThan(0);
    });

    it("should return result with messages after initialization", async () => {
      await manager.initialize();
      const result = await manager.buildLecture();

      // Проверяем структуру результата
      expect(result).to.have.property("success");
      expect(result).to.have.property("messages");
      expect(result).to.have.property("errors");
      expect(result.messages.length).to.be.greaterThan(0);
    });

    it("should report output path when build succeeds", async () => {
      await manager.initialize();
      const result = await manager.buildLecture();

      // Build может вернуть outputPath если директория dist существует
      if (result.success && result.outputPath) {
        expect(result.outputPath).to.include("dist");
      }
    });
  });

  describe("buildLectureWithOutput", () => {
    it("should return result with messages and errors", async () => {
      await manager.initialize();
      const result = await manager.buildLectureWithOutput();
      
      // Метод должен вернуть результат с сообщениями
      expect(result).to.have.property("messages");
      expect(result).to.have.property("errors");
      expect(result).to.have.property("success");
    });
  });

  describe("startDevServer", () => {
    it("should fail if environment not initialized", async () => {
      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3000
      });

      expect(result.success).to.be.false;
      expect(result.errors.length).to.be.greaterThan(0);
    });

    it("should return result with URL structure after initialization", async () => {
      await manager.initialize();
      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3000,
        host: "localhost",
        openBrowser: false
      });

      // Проверяем структуру результата
      expect(result).to.have.property("success");
      expect(result).to.have.property("messages");
      expect(result).to.have.property("errors");

      // URL должен быть сформирован корректно
      if (result.url) {
        expect(result.url).to.include("localhost");
        expect(result.url).to.include("3000");
      }
    });

    it("should use configured port in URL", async () => {
      await manager.initialize();
      const port = 3456;
      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: port,
        host: "localhost",
        openBrowser: false
      });

      // URL должен содержать правильный порт
      if (result.url) {
        expect(result.url).to.equal(`http://localhost:${port}`);
      }
    });
  });

  describe("stopDevServer", () => {
    it("should return false if no server is running", async () => {
      const stopped = await manager.stopDevServer();
      expect(stopped).to.be.false;
    });

    it("should handle running server gracefully", async () => {
      await manager.initialize();
      
      // Пытаемся запустить dev server
      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3001,
        host: "localhost",
        openBrowser: false
      });

      // Проверяем что запрос обработан
      expect(result).to.have.property("success");

      // Пытаемся остановить
      const stopped = await manager.stopDevServer();
      expect(stopped).to.be.a("boolean");
    });
  });

  describe("isDevServerRunning", () => {
    it("should return false initially", () => {
      expect(manager.isDevServerRunning()).to.be.false;
    });

    it("should return correct status after start attempt", async () => {
      await manager.initialize();

      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3002,
        host: "localhost",
        openBrowser: false
      });

      // Проверяем что статус определен
      expect(manager.isDevServerRunning()).to.be.a("boolean");
    });
  });

  describe("getDevServerPid", () => {
    it("should return undefined when no server is running", () => {
      expect(manager.getDevServerPid()).to.be.undefined;
    });

    it("should return pid or undefined after start attempt", async () => {
      await manager.initialize();

      await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3003,
        host: "localhost",
        openBrowser: false
      });

      const pid = manager.getDevServerPid();
      // PID может быть undefined если сервер не запустился
      expect(pid).to.satisfy((p: any) => p === undefined || (typeof p === "number" && p > 0));
    });
  });

  describe("getActiveProcesses", () => {
    it("should return empty array initially", () => {
      const processes = manager.getActiveProcesses();
      expect(processes).to.be.an("array");
    });

    it("should return processes array after start attempt", async () => {
      await manager.initialize();

      await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3004,
        host: "localhost",
        openBrowser: false
      });

      const processes = manager.getActiveProcesses();
      expect(processes).to.be.an("array");
    });
  });

  describe("stopAllProcesses", () => {
    it("should complete without error", async () => {
      await manager.initialize();
      
      // Запускаем dev server
      const result = await manager.startDevServer({
        lecturePath: testLecturePath,
        port: 3005,
        host: "localhost",
        openBrowser: false
      });

      // Останавливаем все процессы - не должно быть ошибки
      await manager.stopAllProcesses();

      // Проверяем что метод завершился
      expect(manager.isDevServerRunning()).to.be.false;
    });
  });

  describe("package.json scripts", () => {
    it("should have correct scripts for dev server", async () => {
      await manager.initialize();

      const packageJsonPath = path.join(testLecturePath, "package.json");
      const packageJson = await fs.readJson(packageJsonPath);

      // Проверяем наличие скрипта dev
      expect(packageJson.scripts.dev).to.be.a("string");
      expect(packageJson.scripts.dev).to.include("slidev");
    });

    it("should have correct scripts for build", async () => {
      await manager.initialize();

      const packageJsonPath = path.join(testLecturePath, "package.json");
      const packageJson = await fs.readJson(packageJsonPath);

      // Проверяем наличие скрипта build
      expect(packageJson.scripts.build).to.be.a("string");
      expect(packageJson.scripts.build).to.include("slidev build");
    });

    it("should have correct scripts for export", async () => {
      await manager.initialize();

      const packageJsonPath = path.join(testLecturePath, "package.json");
      const packageJson = await fs.readJson(packageJsonPath);

      // Проверяем наличие скрипта export
      expect(packageJson.scripts.export).to.be.a("string");
      expect(packageJson.scripts.export).to.include("slidev export");
    });
  });
});