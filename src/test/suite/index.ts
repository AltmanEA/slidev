import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  // Создаем Mocha тест
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise<void>((c, e) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return e(err);
      }

      // Добавляем файлы в тестовый набор
      files.forEach((f: string) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Запускаем Mocha тесты
        mocha.run((failures: number) => {
          if (failures > 0) {
            e(new Error(`${failures} тестов не прошли проверку.`));
          } else {
            c();
          }
        });
      } catch (err) {
        e(err);
      }
    });
  });
}