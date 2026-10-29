1."express": "^5.3.0"

2.npm start

3.Книги Толкина, поля: id - идентификатор, title- название, year - год публикации, read - прочитал ли я ее

4.GET /api/books, GET /api/books/:id, GET /api/info, POST /api/books  

5.поиск по названию - http://localhost:3000/api/books?title=fall%20of, фильтр прочитано/непрочитано - http://localhost:3000/api/books?read=true

6.корректный  
  fetch('http://localhost:3000/api/books', {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({ title: 'Новая книга', year: 2026, read: false })  
  })  
  .then(res => res.json())  
  .then(data => console.log(data));  

  некорректный  
  fetch('http://localhost:3000/api/books', {  
    method: 'POST',  
    headers: { 'Content-Type': 'application/json' },  
    body: JSON.stringify({year: 2026, read: false })  
  })  
  .then(res => res.json())  
  .then(data => console.log(data));  
    
7.
| Метод | URL | Описание | Возможные статусы |
|---|---|---|---|
| GET | /api/books | список | 200 |
| GET | /api/books/:id | один объект | 200, 404 |
| POST | /api/books | создание | 201, 400 |
| GET | /api/info | служебная информация | 200 |
|     |     ?     | неизвестный маршрут | 404 |