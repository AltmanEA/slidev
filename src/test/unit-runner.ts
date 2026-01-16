import Mocha from 'mocha';
import * as path from 'path';

const mocha = new Mocha({
  ui: 'tdd',
  color: true
});

const testsRoot = path.resolve(__dirname, '..');

// Добавляем unit-тесты
mocha.addFile(path.resolve(testsRoot, 'suite/unit.test.js'));
mocha.addFile(path.resolve(testsRoot, 'suite/utilities.test.js'));

// Запускаем тесты
mocha.run(failures => {
  console.log(`\nВыполнено ${mocha.suite.total()} тестов`);
  if (failures) {
    console.error(`❌ ${failures} тестов не прошли проверку`);
    process.exit(1);
  } else {
    console.log('✅ Все тесты прошли успешно');
  }
});