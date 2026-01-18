import * as vscode from "vscode";
import { CourseIndex, CourseIndexLecture } from "./courseIndex";

/**
 * Базовый тип для всех узлов дерева Course Explorer
 */
export abstract class BaseTreeNode extends vscode.TreeItem {
  /**
   * Уникальный идентификатор узла в дереве
   */
  public readonly id: string;

  /**
   * Родительский узел (undefined для корневых узлов)
   */
  public parent?: BaseTreeNode;

  constructor(id: string, label: string, collapsibleState: vscode.TreeItemCollapsibleState) {
    super(label, collapsibleState);
    this.id = id;
    this.label = label;
  }

  /**
   * Возвращает контекстное значение для определения действий в меню
   */
  public abstract getContextValue(): string;
}

/**
 * Узел курса (корень дерева)
 * Представляет весь курс и содержит информацию о course index
 */
export class CourseNode extends BaseTreeNode {
  private readonly courseIndex: CourseIndex;

  constructor(courseIndex: CourseIndex) {
    super(
      "course-root",
      courseIndex.title,
      vscode.TreeItemCollapsibleState.Collapsed
    );
    this.courseIndex = courseIndex;
    
    // Устанавливаем иконку для узла курса
    this.iconPath = new vscode.ThemeIcon("book");
    
    // Добавляем description с количеством лекций
    this.description = `${courseIndex.lectures.length} лекций`;
  }

  /**
   * Возвращает course index для получения лекций
   */
  public getCourseIndex(): CourseIndex {
    return this.courseIndex;
  }

  public getContextValue(): string {
    return "course";
  }
}

/**
 * Узел группировки лекций
 * Группирует лекции по определённому критерию (дата, буквы и т.д.)
 * Пока используется как промежуточный узел для списка лекций
 */
export class LectureGroupNode extends BaseTreeNode {
  private readonly lectures: CourseIndexLecture[];
  private readonly parentCourse: CourseNode;

  constructor(
    parentCourse: CourseNode,
    groupId: string,
    label: string,
    lectures: CourseIndexLecture[]
  ) {
    super(
      `group-${groupId}`,
      label,
      lectures.length > 0 
        ? vscode.TreeItemCollapsibleState.Collapsed 
        : vscode.TreeItemCollapsibleState.None
    );
    this.lectures = lectures;
    this.parentCourse = parentCourse;
    
    // Устанавливаем иконку для группы
    this.iconPath = new vscode.ThemeIcon("folder");
    
    // Добавляем description с количеством лекций
    this.description = `${lectures.length} лекций`;
  }

  /**
   * Возвращает лекции в этой группе
   */
  public getLectures(): CourseIndexLecture[] {
    return this.lectures;
  }

  /**
   * Возвращает родительский узел курса
   */
  public getParentCourse(): CourseNode {
    return this.parentCourse;
  }

  public getContextValue(): string {
    return "lectureGroup";
  }
}

/**
 * Узел отдельной лекции
 * Представляет конкретную лекцию и содержит метаданные
 */
export class LectureNode extends BaseTreeNode {
  /** Данные лекции (публичный доступ для команд расширения) */
  public readonly lecture: CourseIndexLecture;
  private readonly parentGroup: LectureGroupNode;

  constructor(parentGroup: LectureGroupNode, lecture: CourseIndexLecture) {
    super(
      `lecture-${lecture.id}`,
      lecture.title,
      vscode.TreeItemCollapsibleState.None
    );
    this.lecture = lecture;
    this.parentGroup = parentGroup;

    // Устанавливаем иконку для лекции
    this.iconPath = new vscode.ThemeIcon("file-code");

    // Добавляем tooltip с полной информацией
    this.tooltip = this.buildTooltip();

    // Добавляем description с ID лекции
    this.description = lecture.id;

    // Добавляем команду открытия при клике
    this.command = {
      command: "slidev-course-manager.openLectureSource",
      title: "Open Lecture",
      arguments: [this]
    };
  }

  /**
   * Строит tooltip с информацией о лекции
   */
  private buildTooltip(): vscode.MarkdownString {
    const tooltip = new vscode.MarkdownString();
    tooltip.isTrusted = true;
    tooltip.supportHtml = true;

    let content = `### ${this.lecture.title}\n\n`;
    content += `**ID:** ${this.lecture.id}\n\n`;

    if (this.lecture.description) {
      content += `**Описание:** ${this.lecture.description}\n\n`;
    }

    if (this.lecture.date) {
      content += `**Дата:** ${this.lecture.date}\n\n`;
    }

    content += `**URL:** \`${this.lecture.url}\``;

    tooltip.value = content;
    return tooltip;
  }

  /**
   * Возвращает родительский узел группы
   */
  public getParentGroup(): LectureGroupNode {
    return this.parentGroup;
  }

  public getContextValue(): string {
    return "lecture";
  }
}

/**
 * Типы узлов для использования в Tree Data Provider
 */
export type TreeNode = CourseNode | LectureGroupNode | LectureNode;

/**
 * Результат обновления Tree View
 */
export interface TreeRefreshResult {
  success: boolean;
  courseNode?: CourseNode;
  error?: string;
}