const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('data.db');

db.prepare(
    `CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    read INTEGER NOT NULL DEFAULT 0
  )`
).run();

const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get().cnt;
if (count === 0) {
  const insert = db.prepare('INSERT INTO books (title, year, read) VALUES (?, ?, ?)');
  insert.run('The Hobbit', 1937, 1);
  insert.run('The Lord of the Rings', 1955, 1);
  insert.run('The Silmarillion', 1977, 0);
  insert.run('Unfinished Tales', 1980, 0);
  insert.run('The Children of Hurin', 2007, 1);
  insert.run('Beren and Luthien', 2017, 0);
  insert.run('The Fall of Gondolin', 2018, 1);
  insert.run('The Fall of Numenor', 2022, 1);
}

app.get('/api/books', (req, res) => {
  const { title, read } = req.query;

  let sql = 'SELECT id, title, year, read FROM books';
  const conditions = [];
  const params = [];

  if (title) {
    conditions.push('title LIKE ?');
    params.push(`%${title}%`);
  }

  if (read !== undefined) {
    conditions.push('read = ?');
    params.push(read === 'true' ? 1 : 0);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY id';

  const rows = db.prepare(sql).all(...params);
  const books = rows.map(row => ({ ...row, read: Boolean(row.read) }));
  res.json(books);
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);

  const book = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(id);

  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json({ ...book, read: Boolean(book.read) });
});

app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const year = req.body.year ? Number(req.body.year) : null;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (year !== null && (Number.isNaN(year) || year < 0)) {
    return res.status(400).json({ error: 'year must be a positive number' });
  }

  const read = req.body.read !== undefined ? (req.body.read ? 1 : 0) : 0;

  const result = db.prepare('INSERT INTO books (title, year, read) VALUES (?, ?, ?)').run(title, year, read);

  const created = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ ...created, read: Boolean(created.read) });
});

app.patch('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);

  const current = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!current) {
    return res.status(404).json({ error: 'Book not found' });
  }

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const year = req.body.year === undefined ? current.year : Number(req.body.year);
  const read = req.body.read === undefined ? current.read : (req.body.read ? 1 : 0);

  if (!title) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  if (year !== null && (Number.isNaN(year) || year < 0)) {
    return res.status(400).json({ error: 'year must be a positive number' });
  }

  db.prepare('UPDATE books SET title = ?, year = ?, read = ? WHERE id = ?').run(title, year, read, id);

  const updated = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(id);
  res.json({ ...updated, read: Boolean(updated.read) });
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);

  const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.status(204).end();
});

app.get('/api/info', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM books').get().cnt;
  res.json({ name: 'Tolkien Books API', version: 2, booksCount: count });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});