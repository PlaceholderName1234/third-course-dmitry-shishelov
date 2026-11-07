let books = [];
let loading = false;

const listEl = document.querySelector('#book-list');
const formEl = document.querySelector('#book-form');
const titleInput = document.querySelector('#title-input');
const yearInput = document.querySelector('#year-input');
const submitbutton = document.querySelector('#submit-button');
const refreshbutton = document.querySelector('#refresh-button');
const messageEl = document.querySelector('#message');
const filterReadCheckbox = document.querySelector('#filter-read');

function showMessage(text, type = 'error') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  setTimeout(() => {
    messageEl.className = 'message';
  }, 3000);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = 'HTTP ' + response.status;

    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Ответ с ошибкой мог не содержать JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadBooks() {
  loading = true;
  render();

  try {
    const url = filterReadCheckbox.checked 
      ? '/api/books?read=true' 
      : '/api/books';
    
    books = await request(url);
  } catch (error) {
    showMessage(error.message);
    books = [];
  } finally {
    loading = false;
    render();
  }
}

async function createBook(title, year) {
  const data = { title };
  if (year) data.year = year;

  await request('/api/books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

async function toggleBookRead(id, currentRead) {
  await request(`/api/books/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ read: !currentRead })
  });
}

async function deleteBook(id) {
  await request(`/api/books/${id}`, {
    method: 'DELETE'
  });
}

function render() {
  if (loading) {
    listEl.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = 'Загрузка...';
    listEl.appendChild(li);
    return;
  }

  if (books.length === 0) {
    listEl.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = 'Список пуст';
    li.style.textAlign = 'center';
    listEl.appendChild(li);
    return;
  }

  listEl.innerHTML = '';
  for (const book of books) {
    const li = document.createElement('li');
    li.className = 'book-item' + (book.read ? ' read' : '');

    const info = document.createElement('div');
    info.className = 'book-info';

    const title = document.createElement('strong');
    title.textContent = book.title;
      
    const meta = document.createElement('span');
    meta.textContent =  (book.year ? ` (${book.year})` : '') + (book.read ? ' (Прочитано)' : '');
  
    info.appendChild(title);
    info.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'book-actions';

    const togglebutton = document.createElement('button');
    togglebutton.className = 'button-toggle';
    togglebutton.textContent = book.read ? 'Отметить непрочитанной' : 'Отметить прочитанной';
    togglebutton.addEventListener('click', async () => {
      try {
        await toggleBookRead(book.id, book.read);
        await loadBooks();
      } catch (e) {
        showMessage(e.message);
      }
    });

    const delbutton = document.createElement('button');
    delbutton.className = 'button-delete';
    delbutton.textContent = 'Удалить';
    delbutton.addEventListener('click', async () => {
      if (confirm(`Удалить книгу "${book.title}"?`)) {
        try {
          await deleteBook(book.id);
          await loadBooks();
          showMessage('Книга удалена', 'success');
        } catch (e) {
          showMessage(e.message);
        }
      }
    });

    actions.appendChild(togglebutton);
    actions.appendChild(delbutton);

    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  }
}

formEl.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const year = yearInput.value ? Number(yearInput.value) : null;

  if (!title) {
    showMessage('Введите название книги');
    return;
  }

  submitbutton.disabled = true;

  try {
    await createBook(title, year);
    titleInput.value = '';
    yearInput.value = '';
    await loadBooks();
    showMessage('Книга добавлена', 'success');
  } catch (e) {
    showMessage(e.message);
  } finally {
    submitbutton.disabled = false;
  }
});

refreshbutton.addEventListener('click', loadBooks);

filterReadCheckbox.addEventListener('change', loadBooks);

loadBooks();