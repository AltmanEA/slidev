import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs-extra";
import { CourseTreeDataProvider } from "./providers/treeDataProvider";
import { LectureNode } from "./types/treeNodes";

/**
 * Конфигурация расширения
 */
interface ExtensionConfig {
  /** Путь к директории slides/ */
  slidesDirectory: string;
  /** Путь к выходной директории */
  outputDirectory: string;
  /** Название курса */
  courseTitle: string;
  /** Базовый URL */
  baseUrl: string;
}

/**
 * Получает конфигурацию расширения из workspace
 */
function getExtensionConfig(workspaceRoot: string): ExtensionConfig {
  return {
    slidesDirectory: path.join(workspaceRoot, "slides"),
    outputDirectory: path.join(workspaceRoot, "dist"),
    courseTitle: path.basename(workspaceRoot),
    baseUrl: ""
  };
}

/**
 * Проверяет существование необходимых директорий
 */
async function checkWorkspaceStructure(workspaceRoot: string): Promise<{
  slidesExists: boolean;
  outputExists: boolean;
}> {
  const slidesDir = path.join(workspaceRoot, "slides");
  const outputDir = path.join(workspaceRoot, "dist");

  return {
    slidesExists: await fs.pathExists(slidesDir),
    outputExists: await fs.pathExists(outputDir)
  };
}

/**
 * Получает путь к slides.md для лекции
 */
function getLectureSlidesPath(workspaceRoot: string, lectureId: string): string {
  return path.join(workspaceRoot, "slides", lectureId, "slides.md");
}

/**
 * Получает путь к директории лекции
 */
function getLecturePath(workspaceRoot: string, lectureId: string): string {
  return path.join(workspaceRoot, "slides", lectureId);
}

/**
 * Валидирует ID лекции
 */
function isValidLectureId(id: string): boolean {
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  return idRegex.test(id);
}

/**
 * Активация расширения
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log("Extension activated!");

  // Получаем workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  if (!workspaceRoot) {
    console.log("No workspace folder found");
    return;
  }

  // Проверяем структуру проекта
  const structure = await checkWorkspaceStructure(workspaceRoot);
  
  if (!structure.slidesExists) {
    console.log(`Slides directory not found: ${path.join(workspaceRoot, "slides")}`);
    return;
  }

  // Получаем конфигурацию
  const config = getExtensionConfig(workspaceRoot);

  // Создаём Tree Data Provider
  const treeDataProvider = new CourseTreeDataProvider({
    workspaceRoot,
    ...config
  });

  // Создаём Tree View
  const treeView = vscode.window.createTreeView("courseExplorer", {
    treeDataProvider,
    showCollapseAll: true
  });

  // Регистрируем команды
  registerCommands(context, treeDataProvider, workspaceRoot);

  // Создаём file watcher для автоматического обновления
  registerFileWatcher(context, treeDataProvider, workspaceRoot);

  // Подписываемся на Tree View
  context.subscriptions.push(treeView);

  // Выполняем первичное обновление
  await treeDataProvider.refresh();
}

/**
 * Регистрирует file watcher для отслеживания изменений в slides/
 */
function registerFileWatcher(
  context: vscode.ExtensionContext,
  treeDataProvider: CourseTreeDataProvider,
  workspaceRoot: string
): void {
  const slidesDir = path.join(workspaceRoot, "slides");

  // Создаём watcher для директории slides/
  const fileWatcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(slidesDir, "**/slides.md")
  );

  // Обработка изменений файлов
  fileWatcher.onDidChange(async (uri) => {
    console.log(`File changed: ${uri.fsPath}`);
    await treeDataProvider.refresh();
  });

  fileWatcher.onDidCreate(async (uri) => {
    console.log(`File created: ${uri.fsPath}`);
    await treeDataProvider.refresh();
  });

  fileWatcher.onDidDelete(async (uri) => {
    console.log(`File deleted: ${uri.fsPath}`);
    await treeDataProvider.refresh();
  });

  // Подписываемся на watcher
  context.subscriptions.push(fileWatcher);
}

/**
 * Регистрирует команды расширения
 */
function registerCommands(
  context: vscode.ExtensionContext,
  treeDataProvider: CourseTreeDataProvider,
  workspaceRoot: string
): void {
  // ============================================
  // Команды для Course Node
  // ============================================

  // Команда сборки курса
  context.subscriptions.push(
    vscode.commands.registerCommand("slidev-course-manager.buildCourse", async () => {
      try {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Building course...",
            cancellable: false
          },
          async (progress) => {
            progress.report({ message: "Building entire course..." });
            
            // TODO: Реализовать сборку курса через Build System
            console.log("Building entire course");
            
            // Имитация процесса сборки
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            vscode.window.showInformationMessage("Course build completed!");
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to build course: ${error}`);
      }
    })
  );

  // Команда просмотра курса
  context.subscriptions.push(
    vscode.commands.registerCommand("slidev-course-manager.viewCourse", async () => {
      try {
        const courseNode = treeDataProvider.getCourseNode();
        if (!courseNode) {
          vscode.window.showWarningMessage("No course loaded. Please refresh Course Explorer.");
          return;
        }

        const courseIndex = courseNode.getCourseIndex();
        const lectures = courseIndex.lectures;

        if (lectures.length === 0) {
          vscode.window.showWarningMessage("No lectures found in the course.");
          return;
        }

        // Показываем выбор лекции для просмотра
        const lectureItems = lectures.map(l => ({
          label: l.title,
          description: l.id,
          detail: l.description,
          lecture: l
        }));

        const selected = await vscode.window.showQuickPick(lectureItems, {
          placeHolder: "Select a lecture to preview",
          title: "Preview Course"
        });

        if (selected) {
          vscode.window.showInformationMessage(
            `Opening preview for: ${selected.label}`
          );
          // TODO: Реализовать открытие превью курса
          console.log("Opening course preview for:", selected.lecture.id);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to view course: ${error}`);
      }
    })
  );

  // Команда создания новой лекции
  context.subscriptions.push(
    vscode.commands.registerCommand("slidev-course-manager.createLecture", async () => {
      try {
        const lectureId = await vscode.window.showInputBox({
          prompt: "Enter lecture ID (directory name)",
          placeHolder: "e.g., lecture-8",
          validateInput: (value) => {
            if (!value) {
              return "Lecture ID is required";
            }
            if (!isValidLectureId(value)) {
              return "ID can only contain letters, numbers, hyphens and underscores";
            }
            return null;
          }
        });

        if (!lectureId) {
          return; // Пользователь отменил ввод
        }

        const slidesDir = getLecturePath(workspaceRoot, lectureId);
        
        if (await fs.pathExists(slidesDir)) {
          vscode.window.showErrorMessage(
            `Lecture directory already exists: ${slidesDir}`
          );
          return;
        }

        await fs.ensureDir(slidesDir);
        
        // Создаём базовый slides.md с frontmatter
        const slidesContent = `---
title: ${lectureId}
description: 
date: ${new Date().toISOString().split("T")[0]}
---

# ${lectureId}

Start writing your slides here...
`;
        await fs.writeFile(path.join(slidesDir, "slides.md"), slidesContent, "utf-8");
        
        // Открываем созданный файл
        const slidesMdPath = getLectureSlidesPath(workspaceRoot, lectureId);
        await vscode.window.showTextDocument(vscode.Uri.file(slidesMdPath));
        
        vscode.window.showInformationMessage(
          `Created lecture: ${lectureId}`
        );
        
        // Обновляем Tree View
        await treeDataProvider.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to create lecture: ${error}`
        );
      }
    })
  );

  // ============================================
  // Команды для Lecture Node
  // ============================================

  // Команда открытия исходного кода лекции
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "slidev-course-manager.openLectureSource",
      async (node: LectureNode) => {
        if (!node?.lecture?.id) {
          vscode.window.showErrorMessage("Invalid lecture node");
          return;
        }

        try {
          const slidesMdPath = getLectureSlidesPath(workspaceRoot, node.lecture.id);
          
          if (await fs.pathExists(slidesMdPath)) {
            await vscode.window.showTextDocument(vscode.Uri.file(slidesMdPath));
          } else {
            vscode.window.showErrorMessage(
              `File not found: ${slidesMdPath}`
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to open lecture source: ${error}`
          );
        }
      }
    )
  );

  // Команда запуска dev сервера для лекции
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "slidev-course-manager.startDevelopmentServer",
      async (node: LectureNode) => {
        if (!node?.lecture?.id) {
          vscode.window.showErrorMessage("Invalid lecture node");
          return;
        }

        try {
          const lecturePath = getLecturePath(workspaceRoot, node.lecture.id);
          
          // Проверяем существование директории лекции
          if (!(await fs.pathExists(lecturePath))) {
            vscode.window.showErrorMessage(
              `Lecture directory not found: ${lecturePath}`
            );
            return;
          }

          vscode.window.showInformationMessage(
            `Starting dev server for: ${node.lecture.title}`
          );
          
          // TODO: Реализовать запуск dev server через LectureEnvironmentManager
          console.log(`Starting dev server for lecture: ${node.lecture.id}`);
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to start dev server: ${error}`
          );
        }
      }
    )
  );

  // Команда сборки лекции
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "slidev-course-manager.buildLecture",
      async (node: LectureNode) => {
        if (!node?.lecture?.id) {
          vscode.window.showErrorMessage("Invalid lecture node");
          return;
        }

        try {
          const lecturePath = getLecturePath(workspaceRoot, node.lecture.id);
          
          if (!(await fs.pathExists(lecturePath))) {
            vscode.window.showErrorMessage(
              `Lecture directory not found: ${lecturePath}`
            );
            return;
          }

          vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: `Building lecture: ${node.lecture.title}`,
              cancellable: false
            },
            async (progress) => {
              progress.report({ message: "Building lecture..." });
              
              // TODO: Реализовать сборку лекции через Build System
              console.log(`Building lecture: ${node.lecture.id}`);
              
              // Имитация процесса сборки
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              vscode.window.showInformationMessage(
                `Lecture "${node.lecture.title}" built successfully!`
              );
            }
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to build lecture: ${error}`
          );
        }
      }
    )
  );

  // Команда показа в проводнике
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "slidev-course-manager.revealInExplorer",
      async (node: LectureNode) => {
        if (!node?.lecture?.id) {
          vscode.window.showErrorMessage("Invalid lecture node");
          return;
        }

        try {
          const lecturePath = getLecturePath(workspaceRoot, node.lecture.id);
          
          if (await fs.pathExists(lecturePath)) {
            await vscode.commands.executeCommand(
              "revealFileInExplorer",
              vscode.Uri.file(lecturePath)
            );
          } else {
            vscode.window.showErrorMessage(
              `Lecture directory not found: ${lecturePath}`
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to reveal in explorer: ${error}`
          );
        }
      }
    )
  );

  // Команда удаления лекции
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "slidev-course-manager.deleteLecture",
      async (node: LectureNode) => {
        if (!node?.lecture?.id) {
          vscode.window.showErrorMessage("Invalid lecture node");
          return;
        }

        try {
          const lectureTitle = node.lecture.title;
          const lecturePath = getLecturePath(workspaceRoot, node.lecture.id);

          // Подтверждение удаления
          const confirmed = await vscode.window.showWarningMessage(
            `Are you sure you want to delete lecture "${lectureTitle}"? This action cannot be undone.`,
            { modal: true },
            "Delete"
          );

          if (confirmed !== "Delete") {
            return; // Пользователь отменил
          }

          if (!(await fs.pathExists(lecturePath))) {
            vscode.window.showErrorMessage(
              `Lecture directory not found: ${lecturePath}`
            );
            return;
          }

          // Удаляем директорию лекции
          await fs.remove(lecturePath);
          
          vscode.window.showInformationMessage(
            `Deleted lecture: ${lectureTitle}`
          );
          
          // Обновляем Tree View
          await treeDataProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(
            `Failed to delete lecture: ${error}`
          );
        }
      }
    )
  );

  // ============================================
  // Команды для Tree View
  // ============================================

  // Команда обновления Course Explorer
  context.subscriptions.push(
    vscode.commands.registerCommand("slidev-course-manager.refreshCourseExplorer", async () => {
      try {
        const result = await treeDataProvider.refresh();
        
        if (result.success) {
          const lectureCount = result.courseNode?.getCourseIndex().lectures.length ?? 0;
          
          if (lectureCount > 0) {
            vscode.window.setStatusBarMessage(
              `Course Explorer updated (${lectureCount} lectures)`,
              3000
            );
          } else {
            vscode.window.setStatusBarMessage(
              "Course Explorer updated (no lectures found)",
              3000
            );
          }
        } else {
          vscode.window.showErrorMessage(
            `Failed to update Course Explorer: ${result.error}`
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to refresh Course Explorer: ${error}`
        );
      }
    })
  );
}

/**
 * Деактивация расширения
 */
export function deactivate() {
  console.log("Extension deactivated!");
}
