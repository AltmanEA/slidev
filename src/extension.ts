import * as vscode from "vscode";

// Простой Tree View Provider
class SimpleTreeDataProvider implements vscode.TreeDataProvider<string> {
  private _onDidChangeTreeData: vscode.EventEmitter<string | undefined | null | void> = 
    new vscode.EventEmitter<string | undefined | null | void>();
  
  readonly onDidChangeTreeData: vscode.Event<string | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: string): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(element, vscode.TreeItemCollapsibleState.None);
    treeItem.command = {
      command: "slidev-course-manager.refreshCourseExplorer",
      title: "Test Command"
    };
    return treeItem;
  }

  async getChildren(element?: string): Promise<string[]> {
    if (!element) {
      return ["Course Explorer", "Lectures (Coming Soon)"];
    }
    return [];
  }
}

export { SimpleTreeDataProvider };

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension activated!");

  // Создаем Tree View
  const treeDataProvider = new SimpleTreeDataProvider();
  const treeView = vscode.window.createTreeView("courseExplorer", {
    treeDataProvider
  });

  // Простая команда для тестирования
  context.subscriptions.push(
    vscode.commands.registerCommand("slidev-course-manager.refreshCourseExplorer", () => {
      vscode.window.showInformationMessage("Slidev Course Manager: Extension is working!");
      treeDataProvider.refresh();
    })
  );

  // Подписываемся на Tree View
  context.subscriptions.push(treeView);
}

export function deactivate() {
  console.log("Extension deactivated!");
}
