const Database = require('better-sqlite3');
const db = new Database('data.db');

db.pragma('foreign_keys = ON');

db.prepare(`
  CREATE TABLE IF NOT EXISTS shelves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    read INTEGER NOT NULL DEFAULT 0,
    shelf_id INTEGER,
    FOREIGN KEY (shelf_id) REFERENCES shelves(id)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    from_shelf_id INTEGER NOT NULL,
    to_shelf_id INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id),
    FOREIGN KEY (from_shelf_id) REFERENCES shelves(id),
    FOREIGN KEY (to_shelf_id) REFERENCES shelves(id),
    CHECK (from_shelf_id <> to_shelf_id)
  )
`).run();

const shelfCount = db.prepare('SELECT COUNT(*) AS c FROM shelves').get().c;
if (shelfCount === 0) {
  const insertShelf = db.prepare('INSERT INTO shelves (name) VALUES (?)');
  insertShelf.run('Полка A');
  insertShelf.run('Полка B');
  console.log('Созданы полки A и B');
}

const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get().c;
if (count > 0) {
  console.log('База уже содержит', count, 'записей.');
  process.exit(0);
}

const titles = [
  'The Hobbit', 'The Lord of the Rings', 'The Adventures of Tom Bombadil',
  'The Road Goes Ever On: A Song Cycle', 'The Silmarillion',
  'Unfinished Tales of Númenor and Middle-earth', 'The Book of Lost Tales, Part One',
  'The Book of Lost Tales, Part Two', 'The Lays of Beleriand', 'The Shaping of Middle-earth',
  'The Lost Road and Other Writings', 'The Return of the Shadow', 'The Treason of Isengard',
  'The War of the Ring', 'Sauron Defeated', 'Morgoth\'s Ring', 'The War of the Jewels',
  'The Peoples of Middle-earth', 'The Children of Húrin', 'Beren and Lúthien',
];

const insert = db.prepare('INSERT INTO books (title, year, read, shelf_id) VALUES (?, ?, ?, ?)');
const insertMany = db.transaction((items) => {
  for (const item of items) insert.run(item.title, item.year, item.read, item.shelf_id);
});

const shelves = db.prepare('SELECT id FROM shelves ORDER BY id').all();

insertMany(
  titles.map((title, i) => ({
    title,
    year: 1937 + i * 4,
    read: Math.random() > 0.5 ? 1 : 0,
    shelf_id: i < titles.length / 2 ? shelves[0].id : shelves[1].id
  }))
);

console.log('Добавлено', titles.length, 'записей.');