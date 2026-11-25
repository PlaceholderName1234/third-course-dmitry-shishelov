const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

function parsePositiveInt(raw, defaultValue, maxValue) {
  if (raw === undefined) return defaultValue;
  if (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) return null;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > maxValue) return null;
  return value;
}

function parseBool(raw) {
  if (raw === undefined || raw === '') return undefined;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

function isPositiveInteger(x) {
  return Number.isSafeInteger(x) && x > 0;
}

app.get('/api/books', (req, res) => {
  const page  = parsePositiveInt(req.query.page, 1, 1000000);
  const limit = parsePositiveInt(req.query.limit, 5, 50);
  const read  = parseBool(req.query.read);
  const search = req.query.search ?? '';
  const sort   = req.query.sort ?? 'title';
  const order  = req.query.order ?? 'asc';

  const sortColumns = { id: 'id', title: 'title COLLATE NOCASE', year: 'year' };

  if (
    page === null || limit === null || read === null ||
    typeof search !== 'string' || search.length > 50 ||
    !Object.hasOwn(sortColumns, sort) ||
    !['asc', 'desc'].includes(order)
  ) {
    return res.status(400).json({ error: 'Некорректные параметры запроса' });
  }

  const where = [];
  const params = [];

  if (search.trim()) {
    where.push('title LIKE ?');
    params.push('%' + search.trim() + '%');
  }

  if (read !== undefined) {
    where.push('read = ?');
    params.push(read ? 1 : 0);
  }

  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(
    'SELECT COUNT(*) AS total FROM books ' + whereSql
  ).get(...params).total;

  const offset = (page - 1) * limit;
  const sortSql = sortColumns[sort];
  const orderSql = order.toUpperCase();

  const rows = db.prepare(
    'SELECT b.id, b.title, b.year, b.read, b.shelf_id, s.name AS shelf_name ' +
    'FROM books b LEFT JOIN shelves s ON s.id = b.shelf_id ' +
    whereSql +
    ' ORDER BY ' + sortSql + ' ' + orderSql + ', b.id ASC' +
    ' LIMIT ? OFFSET ?'
  ).all(...params, limit, offset);

  const items = rows.map(row => ({ ...row, read: Boolean(row.read) }));

  res.json({
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = db.prepare(
    'SELECT b.*, s.name AS shelf_name FROM books b LEFT JOIN shelves s ON s.id = b.shelf_id WHERE b.id = ?'
  ).get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ ...book, read: Boolean(book.read) });
});

app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const year  = req.body.year ? Number(req.body.year) : null;
  const shelfId = req.body.shelfId ? Number(req.body.shelfId) : 1;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (year !== null && (Number.isNaN(year) || year < 0))
    return res.status(400).json({ error: 'year must be a positive number' });

  const read = req.body.read !== undefined ? (req.body.read ? 1 : 0) : 0;

  const result = db.prepare(
    'INSERT INTO books (title, year, read, shelf_id) VALUES (?, ?, ?, ?)'
  ).run(title, year, read, shelfId);

  const created = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...created, read: Boolean(created.read) });
});

app.patch('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Book not found' });

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const year  = req.body.year  === undefined ? current.year  : Number(req.body.year);
  const read  = req.body.read  === undefined ? current.read  : (req.body.read ? 1 : 0);

  if (!title) return res.status(400).json({ error: 'title cannot be empty' });
  if (year !== null && (Number.isNaN(year) || year < 0))
    return res.status(400).json({ error: 'year must be a positive number' });

  db.prepare('UPDATE books SET title = ?, year = ?, read = ? WHERE id = ?')
    .run(title, year, read, id);

  const updated = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  res.json({ ...updated, read: Boolean(updated.read) });
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);

  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const deleteTx = db.transaction(() => {
    db.prepare('DELETE FROM transfers WHERE book_id = ?').run(id);
    db.prepare('DELETE FROM books WHERE id = ?').run(id);
  });

  deleteTx();
  res.status(204).end();
});

app.get('/api/shelves', (req, res) => {
  const rows = db.prepare(
    'SELECT s.id, s.name, COUNT(b.id) AS books_count ' +
    'FROM shelves s LEFT JOIN books b ON b.shelf_id = s.id ' +
    'GROUP BY s.id ORDER BY s.id'
  ).all();
  res.json(rows);
});

const transferTx = db.transaction((bookId, fromShelfId, toShelfId) => {
  const update = db.prepare(
    'UPDATE books SET shelf_id = ? WHERE id = ? AND shelf_id = ?'
  ).run(toShelfId, bookId, fromShelfId);

  if (update.changes !== 1) {
    throw new Error('BOOK_NOT_ON_SOURCE_SHELF');
  }

  const log = db.prepare(
    'INSERT INTO transfers (book_id, from_shelf_id, to_shelf_id) VALUES (?, ?, ?)'
  ).run(bookId, fromShelfId, toShelfId);

  return { transferId: Number(log.lastInsertRowid), bookId, fromShelfId, toShelfId };
});

app.post('/api/transfers', (req, res) => {
  const { bookId, fromShelfId, toShelfId } = req.body ?? {};

  if (!isPositiveInteger(bookId) ||
      !isPositiveInteger(fromShelfId) ||
      !isPositiveInteger(toShelfId)) {
    return res.status(400).json({ error: 'Некорректные параметры' });
  }
  if (fromShelfId === toShelfId) {
    return res.status(400).json({ error: 'Полки должны различаться' });
  }

  try {
    const result = transferTx(bookId, fromShelfId, toShelfId);
    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'BOOK_NOT_ON_SOURCE_SHELF') {
      return res.status(409).json({ error: 'Книга не на полке-источнике' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

app.get('/api/transfers', (req, res) => {
  const rows = db.prepare(
    'SELECT t.id, t.book_id, b.title AS book_title, ' +
    't.from_shelf_id, fs.name AS from_shelf_name, ' +
    't.to_shelf_id, ts.name AS to_shelf_name ' +
    'FROM transfers t ' +
    'JOIN books b ON b.id = t.book_id ' +
    'JOIN shelves fs ON fs.id = t.from_shelf_id ' +
    'JOIN shelves ts ON ts.id = t.to_shelf_id ' +
    'ORDER BY t.id DESC LIMIT 50'
  ).all();
  res.json(rows);
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});