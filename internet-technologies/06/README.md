1. npm install, npm start

2. Таблица books: id - первичный ключ, title - обязательное название книги, year - год издания, read - прочитана ли

3.  GET /api/books
    GET /api/books/:id
    GET /api/info  
    POST /api/books  
    PATCH /api/books/:id  
    DELETE /api/books/:id  

4. fetch('http://localhost:3000/api/books', {  
  method: 'POST',  
  headers: { 'Content-Type': 'application/json' },  
  body: JSON.stringify({ title: 'Новая книга' })  
}).then(res => res.json()).then(console.log);  

fetch('http://localhost:3000/api/books/9', {  
  method: 'PATCH',  
  headers: { 'Content-Type': 'application/json' },  
  body: JSON.stringify({ year: 2026 })  
}).then(res => res.json()).then(console.log);  

5. Поиск по названию - GET /api/books?title=fall
    Фильтр по прочитано/непрочитано - GET /api/books?read=true

6. Правила валидации: title - обязательно; year - положительное

7. После перезапуска сервера изменения в базе данных сохраняются

| Метод | URL | SQL | Успешный код | Ошибки |
|---|---|---|---|---|
| GET | /api/books | SELECT | 200 | - |
| GET | /api/books/:id | SELECT | 200 | 404 |
| POST | /api/books | INSERT | 201 | 400 |
| PATCH | /api/books/:id | UPDATE | 200 | 400, 404 |
| DELETE | /api/books/:id | DELETE | 204 | 404 |

