const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

let tolkienBooks = [
  { id: 1, title: 'The Hobbit', year: 1937, read: true },
  { id: 2, title: 'The Lord of the Rings', year: 1955, read: true },
  { id: 3, title: 'The Silmarillion', year: 1977, read: false },
  { id: 4, title: 'Unfinished Tales', year: 1980, read: false },
  { id: 5, title: 'The Children of Hurin', year: 2007, read: true },
  { id: 6, title: 'Beren and Luthien', year: 2017, read: false },
  { id: 7, title: 'The Fall of Gondolin', year: 2018, read: true },
  { id: 8, title: 'The Fall of Numenor', year: 2022, read: true }
];

app.get('/api/books', (req, res) => {
  const { title, read } = req.query;

  let result = tolkienBooks;

  if (title) {
    const searchTitle = title.toLowerCase();
    result = result.filter(book => book.title.toLowerCase().includes(searchTitle));
  }

  if (read !== undefined) {
    const isRead = read === 'true';
    result = result.filter(book => book.read === isRead);
  }

  res.json(result);
});

app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  const book = tolkienBooks.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json(book);
});

app.post('/api/books', (req, res) => {
  const title = String(req.body.title ?? '').trim();
  
  if (!title) {
    return res.status(400).json({
      error: 'title обязательно'
    });
  }

  const newBook = {
    id: Date.now(),
    title: title,
    year: req.body.year ? Number(req.body.year) : null,
    read: req.body.read !== undefined ? Boolean(req.body.read) : false
  };

  tolkienBooks.push(newBook);

  res.status(201).json(newBook);
});

app.get('/api/info', (req, res) => {
  res.json({
    name: '05',
    version: 1,
    booksCount: tolkienBooks.length
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});