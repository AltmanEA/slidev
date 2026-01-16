import * as assert from 'assert';
import * as vscode from 'vscode';
import { after, before, suite, test } from 'mocha';

// Импортируем расширение для тестирования
// import * as myExtension from '../../extension';

suite('Test Suite расширения Slidev Course Manager', () => {
  before(async () => {
    // Ждем активации расширения
    const extensions = vscode.extensions.all;
    const extension = extensions.find(ext => ext.id === 'slidev-course-manager.slidev-course-manager');
    
    if (extension && !extension.isActive) {
      await extension.activate();
    }
  });

  suite('Тест активации расширения', () => {
    test('Расширение должно быть активировано', async () => {
      const extension = vscode.extensions.getExtension('slidev-course-manager.slidev-course-manager');
      assert.ok(extension, 'Расширение должно быть найдено');
      assert.strictEqual(extension!.isActive, true, 'Расширение должно быть активно');
    });

    test('API VS Code должен быть доступен', () => {
      assert.ok(vscode, 'Модуль vscode должен быть доступен');
      assert.ok(vscode.workspace, 'vscode.workspace должен быть доступен');
      assert.ok(vscode.window, 'vscode.window должен быть доступен');
      assert.ok(vscode.commands, 'vscode.commands должен быть доступен');
    });
  });

  suite('Тест команд расширения', () => {
    test('Команды расширения должны быть зарегистрированы', async () => {
      const commands = await vscode.commands.getCommands(true);
      
      // Проверяем наличие основных команд расширения
      const expectedCommands = [
        'slidev-course-manager.refreshCourseExplorer',
        'slidev-course-manager.createLecture',
        'slidev-course-manager.openLectureSource',
        'slidev-course-manager.startDevelopmentServer',
        'slidev-course-manager.buildLecture',
        'slidev-course-manager.buildCourse',
        'slidev-course-manager.viewCourse'
      ];

      for (const command of expectedCommands) {
        assert.ok(
          commands.includes(command),
          `Команда '${command}' должна быть зарегистрирована`
        );
      }
    });
  });

  suite('Тест Tree View', () => {
    test('Course Explorer view должен существовать', () => {
      const courseExplorer = vscode.window.createTreeView('courseExplorer', {
        treeDataProvider: {
          getChildren: () => Promise.resolve(['test']),
          getTreeItem: (element: string) => ({
            label: element,
            collapsibleState: vscode.TreeItemCollapsibleState.None
          })
        }
      });
      
      assert.ok(courseExplorer, 'Course Explorer view должен быть создан');
    });
  });

  suite('Тест workspace', () => {
    test('Workspace должен быть открыт', () => {
      assert.ok(vscode.workspace.workspaceFolders, 'Должна быть открыта рабочая область');
      if (vscode.workspace.workspaceFolders) {
        assert.ok(vscode.workspace.workspaceFolders.length > 0, 'Должна быть хотя бы одна папка в workspace');
      }
    });

    test('Конфигурация расширения должна быть доступна', () => {
      const config = vscode.workspace.getConfiguration('slidev-course-manager');
      assert.ok(config, 'Конфигурация расширения должна быть доступна');
    });
  });

  after(() => {
    vscode.window.showInformationMessage('Все тесты завершены!');
  });
});