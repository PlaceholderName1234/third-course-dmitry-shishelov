const Database = require('better-sqlite3');
const db = new Database('data.db');
db.pragma('foreign_keys = ON');

const bookId = 1; 

console.log('\n--- ДО транзакции ---');
const before = db.prepare('SELECT id, title, shelf_id FROM books WHERE id = ?').get(bookId);
const beforeLog = db.prepare('SELECT COUNT(*) AS c FROM transfers').get().c;
console.log('Книга:', before);
console.log('Записей в журнале:', beforeLog);

const failedTx = db.transaction(() => {
  db.prepare('UPDATE books SET shelf_id = 2 WHERE id = ?').run(bookId);

  throw new Error('Имитация ошибки');
});

try {
  failedTx();
} catch (e) {
  console.log('\nОшибка внутри транзакции');
  console.log(e.message);
}

console.log('\nПосле транзакции');
const after = db.prepare('SELECT id, title, shelf_id FROM books WHERE id = ?').get(bookId);
const afterLog = db.prepare('SELECT COUNT(*) AS c FROM transfers').get().c;
console.log('Книга:', after);
console.log('Записей в журнале:', afterLog);

console.log('\nПроверка инварианта:');
if (after.shelf_id === before.shelf_id && afterLog === beforeLog) {
  console.log('Данные не изменились');
} else {
  console.log('ОШИБКА:');
  console.log('Было:', before, 'стало:', after);
}