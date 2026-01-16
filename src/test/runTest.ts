import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // Папка, содержащая манифест расширения package.json
    // Передается в --extensionDevelopmentPath
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // Путь к скрипту запуска тестов расширения
    // Передается в --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Скачиваем VS Code, распаковываем и запускаем интеграционные тесты
    await runTests({ 
      extensionDevelopmentPath, 
      extensionTestsPath,
      launchArgs: ['--disable-extensions'],
      version: 'stable'
    });
  } catch (err) {
    console.error('Не удалось запустить тесты');
    console.error(err);
    process.exit(1);
  }
}

main();