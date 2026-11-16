const path = require('node:path');
const express = require('express');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = new Database('data.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    year INTEGER,
    read INTEGER NOT NULL DEFAULT 0
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

app.get('/api/books', (req, res) => {
  const page  = parsePositiveInt(req.query.page, 1, 1000000);
  const limit = parsePositiveInt(req.query.limit, 5, 50);
  const read  = parseBool(req.query.read);
  const sort   = req.query.sort ?? 'title';
  const order  = req.query.order ?? 'asc';
  
  const search = req.query.search ?? '';

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
    'SELECT id, title, year, read FROM books ' +
    whereSql +
    ' ORDER BY ' + sortSql + ' ' + orderSql + ', id ASC' +
    ' LIMIT ? OFFSET ?'
  ).all(...params, limit, offset);

  const items = rows.map(row => ({ ...row, read: Boolean(row.read) }));

  res.json({
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json({ ...book, read: Boolean(book.read) });
});

app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const year  = req.body.year ? Number(req.body.year) : null;

  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (year !== null && (Number.isNaN(year) || year < 0)) {
    return res.status(400).json({ error: 'year must be a positive number' });
  }

  const read = req.body.read !== undefined ? (req.body.read ? 1 : 0) : 0;

  const result = db.prepare(
    'INSERT INTO books (title, year, read) VALUES (?, ?, ?)'
  ).run(title, year, read);

  const created = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...created, read: Boolean(created.read) });
});

app.patch('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const current = db.prepare('SELECT * FROM books WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Book not found' });

  const title = req.body.title === undefined ? current.title : String(req.body.title).trim();
  const year  = req.body.year  === undefined ? current.year  : Number(req.body.year);
  const read  = req.body.read  === undefined ? current.read  : (req.body.read ? 1 : 0);

  if (!title) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }
  if (year !== null && (Number.isNaN(year) || year < 0)) {
    return res.status(400).json({ error: 'year must be a positive number' });
  }

  db.prepare(
    'UPDATE books SET title = ?, year = ?, read = ? WHERE id = ?'
  ).run(title, year, read, id);

  const updated = db.prepare('SELECT id, title, year, read FROM books WHERE id = ?').get(id);
  res.json({ ...updated, read: Boolean(updated.read) });
});

app.delete('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare('DELETE FROM books WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});