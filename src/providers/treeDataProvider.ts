import * as vscode from "vscode";
import * as path from "path";
import { CourseIndexGenerator } from "../services/courseIndexGenerator";
import {
  BaseTreeNode,
  CourseNode,
  LectureGroupNode,
  LectureNode,
  TreeRefreshResult
} from "../types/treeNodes";
import { CourseIndexLecture } from "../types/courseIndex";

/**
 * Конфигурация Tree Data Provider
 */
export interface CourseTreeDataProviderConfig {
  /** Путь к корневой директории проекта */
  workspaceRoot: string;
  
  /** Путь к директории slides/ */
  slidesDirectory: string;
  
  /** Путь к выходной директории */
  outputDirectory: string;
  
  /** Название курса */
  courseTitle: string;
  
  /** Базовый URL для формирования путей лекций */
  baseUrl?: string;
}

/**
 * Tree Data Provider для Course Explorer
 * Отображает структуру курса:
 * - Course Node (корень курса)
 *   - Lecture Group Node (группировка лекций)
 *     - Lecture Node (отдельная лекция)
 */
export class CourseTreeDataProvider implements vscode.TreeDataProvider<BaseTreeNode> {
  private readonly config: CourseTreeDataProviderConfig;
  private readonly courseIndexGenerator: CourseIndexGenerator;
  
  // Событие для уведомления об изменениях в дереве
  private readonly _onDidChangeTreeData: vscode.EventEmitter<BaseTreeNode | undefined | null | void>;
  readonly onDidChangeTreeData: vscode.Event<BaseTreeNode | undefined | null | void>;
  
  // Кэш узлов дерева
  private courseNode?: CourseNode;

  constructor(config: CourseTreeDataProviderConfig) {
    this.config = config;
    
    // Инициализируем generator для получения course index
    this.courseIndexGenerator = new CourseIndexGenerator({
      courseTitle: config.courseTitle,
      slidesDirectory: config.slidesDirectory,
      outputDirectory: config.outputDirectory,
      baseUrl: config.baseUrl
    });

    // Создаём event emitter
    this._onDidChangeTreeData = new vscode.EventEmitter<BaseTreeNode | undefined | null | void>();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  /**
   * Получает TreeItem для отображения в дереве
   * @param element - узел дерева
   * @returns TreeItem для VS Code
   */
  public getTreeItem(element: BaseTreeNode): vscode.TreeItem {
    // Возвращаем сам элемент, так как он уже наследует TreeItem
    return element;
  }

  /**
   * Получает дочерние элементы для узла
   * @param element - родительский узел (undefined для корня)
   * @returns Promise с массивом дочерних узлов
   */
  public async getChildren(element?: BaseTreeNode): Promise<BaseTreeNode[]> {
    // Если элемент не указан, возвращаем корень курса
    if (!element) {
      return this.getRootChildren();
    }

    // Обрабатываем дочерние элементы в зависимости от типа узла
    if (element instanceof CourseNode) {
      return this.getCourseNodeChildren(element);
    }

    if (element instanceof LectureGroupNode) {
      return this.getLectureGroupChildren(element);
    }

    // LectureNode не имеет дочерних элементов
    return [];
  }

  /**
   * Получает корневые элементы (Course Node)
   */
  private async getRootChildren(): Promise<BaseTreeNode[]> {
    try {
      // Пытаемся получить существующий course index
      const courseIndex = await this.courseIndexGenerator.getCurrentIndex();

      if (courseIndex && courseIndex.lectures.length > 0) {
        this.courseNode = new CourseNode(courseIndex);
        return [this.courseNode];
      }

      // Если course index не существует или пуст, показываем сообщение
      return [];
    } catch (error) {
      console.error("Failed to get root children:", error);
      return [];
    }
  }

  /**
   * Получает дочерние элементы Course Node (Lecture Groups)
   */
  private getCourseNodeChildren(courseNode: CourseNode): BaseTreeNode[] {
    const courseIndex = courseNode.getCourseIndex();
    const lectures = courseIndex.lectures;

    // Группируем лекции по первой букве для наглядности
    const groupedLectures = this.groupLecturesByFirstLetter(lectures);

    // Создаём группы лекций
    const groups: LectureGroupNode[] = [];
    
    for (const [groupLabel, groupLectures] of groupedLectures) {
      const groupId = groupLabel.toLowerCase();
      const group = new LectureGroupNode(courseNode, groupId, groupLabel, groupLectures);
      groups.push(group);
    }

    // Сортируем группы по алфавиту (label - это string из конструктора TreeItem)
    groups.sort((a, b) => String(a.label).localeCompare(String(b.label)));

    return groups;
  }

  /**
   * Получает дочерние элементы Lecture Group Node (Lectures)
   */
  private getLectureGroupChildren(groupNode: LectureGroupNode): LectureNode[] {
    const lectures = groupNode.getLectures();

    // Создаём узлы лекций
    const lectureNodes: LectureNode[] = [];
    
    for (const lecture of lectures) {
      const lectureNode = new LectureNode(groupNode, lecture);
      lectureNodes.push(lectureNode);
    }

    // Сортируем лекции по дате (если доступна), затем по ID
    lectureNodes.sort((a, b) => {
      const lectureA = a.lecture;
      const lectureB = b.lecture;

      // Сортировка по дате
      if (lectureA.date && lectureB.date) {
        const dateComparison = lectureA.date.localeCompare(lectureB.date);
        if (dateComparison !== 0) {
          return dateComparison;
        }
      }

      // Сортировка по ID как fallback
      return lectureA.id.localeCompare(lectureB.id);
    });

    return lectureNodes;
  }

  /**
   * Группирует лекции по первой букве названия
   */
  private groupLecturesByFirstLetter(
    lectures: CourseIndexLecture[]
  ): Map<string, CourseIndexLecture[]> {
    const groups = new Map<string, CourseIndexLecture[]>();

    for (const lecture of lectures) {
      const firstLetter = lecture.title.charAt(0).toUpperCase();
      
      if (!groups.has(firstLetter)) {
        groups.set(firstLetter, []);
      }
      
      groups.get(firstLetter)!.push(lecture);
    }

    return groups;
  }

  /**
   * Обновляет дерево и возвращает результат
   */
  public async refresh(): Promise<TreeRefreshResult> {
    try {
      // Сбрасываем кэш
      this.courseNode = undefined;

      // Генерируем новый course index
      const result = await this.courseIndexGenerator.generate();

      if (result.success) {
        // Получаем обновлённый course index
        const courseIndex = await this.courseIndexGenerator.getCurrentIndex();
        
        if (courseIndex) {
          this.courseNode = new CourseNode(courseIndex);
          this._onDidChangeTreeData.fire();
          
          return {
            success: true,
            courseNode: this.courseNode
          };
        }
      }

      return {
        success: false,
        error: result.errors.length > 0 ? result.errors.join(", ") : "Unknown error"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Получает текущий узел курса
   */
  public getCourseNode(): CourseNode | undefined {
    return this.courseNode;
  }

  /**
   * Находит лекцию по ID
   */
  public async findLectureById(lectureId: string): Promise<LectureNode | undefined> {
    const courseIndex = await this.courseIndexGenerator.getCurrentIndex();
    
    if (!courseIndex) {
      return undefined;
    }

    const lecture = courseIndex.lectures.find(l => l.id === lectureId);
    
    if (!lecture) {
      return undefined;
    }

    // Находим родительскую группу
    const firstLetter = lecture.title.charAt(0).toUpperCase();
    
    // Создаём временные узлы для поиска
    const tempCourseNode = new CourseNode(courseIndex);
    const tempGroupNode = new LectureGroupNode(
      tempCourseNode,
      firstLetter.toLowerCase(),
      firstLetter,
      [lecture]
    );
    
    return new LectureNode(tempGroupNode, lecture);
  }

  /**
   * Получает конфигурацию провайдера
   */
  public getConfig(): CourseTreeDataProviderConfig {
    return { ...this.config };
  }
}