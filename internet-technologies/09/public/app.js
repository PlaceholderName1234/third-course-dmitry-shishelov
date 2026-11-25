let books = [];
let pagination = { page: 1, limit: 5, total: 0, pages: 0 };
let loading = false;

let filters = {
  search: '',
  read: '',
  sort: 'title',
  order: 'asc',
  page: 1,
  limit: 5
};

const listEl = document.querySelector('#book-list');
const formEl = document.querySelector('#book-form');
const titleInput = document.querySelector('#title-input');
const yearInput = document.querySelector('#year-input');
const submitbutton = document.querySelector('#submit-button');
const messageEl = document.querySelector('#message');
const searchInput = document.querySelector('#search-input');
const readFilter = document.querySelector('#read-filter');
const sortSelect = document.querySelector('#sort-select');
const limitSelect = document.querySelector('#limit-select');
const prevbutton = document.querySelector('#prev-button');
const nextbutton = document.querySelector('#next-button');
const pageInfo = document.querySelector('#page-info');

function showMessage(text, type = 'error') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  setTimeout(() => { messageEl.className = 'message'; }, 3500);
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    let message = 'Ошибка HTTP ' + response.status;
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

function makeBooksUrl() {
  const params = new URLSearchParams({
    sort: filters.sort,
    order: filters.order,
    page: String(filters.page),
    limit: String(filters.limit)
  });
  if (filters.search) params.set('search', filters.search);
  if (filters.read !== '') params.set('read', filters.read);
  return '/api/books?' + params.toString();
}

async function loadBooks() {
  loading = true;
  render();

  try {
    const result = await request(makeBooksUrl());
    books = result.items;
    pagination = result.pagination;

    if (pagination.pages > 0 && filters.page > pagination.pages) {
      filters.page = pagination.pages;
      await loadBooks();
      return;
    }
    if (pagination.pages === 0) {
      filters.page = 1;
    }
  } catch (e) {
    showMessage(e.message);
    books = [];
    pagination = { page: 1, limit: filters.limit, total: 0, pages: 0 };
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

async function toggleRead(id, currentRead) {
  await request(`/api/books/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ read: !currentRead })
  });
}

async function deleteBook(id) {
  await request(`/api/books/${id}`, { method: 'DELETE' });
}

function render() {
  listEl.innerHTML = '';

  if (loading) {
    const li = document.createElement('li');
    li.textContent = 'Загрузка...';
    listEl.appendChild(li);
    updatePaginationUI();
    return;
  }

  if (books.length === 0) {
    const li = document.createElement('li');
    li.textContent = pagination.total === 0 && !filters.search && filters.read === ''
      ? 'Список пуст'
      : 'Ничего не найдено';
    li.style.textAlign = 'center';
    li.style.padding = '20px';
    listEl.appendChild(li);
    updatePaginationUI();
    return;
  }

  for (const book of books) {
    const li = document.createElement('li');
    li.className = 'book-item';

    const info = document.createElement('div');
    info.className = 'book-info';

    const title = document.createElement('strong');
    title.textContent = book.title + (book.read ? ' (Прочитано)' : '');
    const meta = document.createElement('span');
    meta.textContent = book.year ? ` (${book.year})` : '';

    info.appendChild(title);
    info.appendChild(meta);

    if (book.shelf_name) {
      const shelfSpan = document.createElement('span');
      shelfSpan.className = 'shelf-name';
      shelfSpan.textContent = book.shelf_name;
      info.appendChild(shelfSpan);
    }

    const actions = document.createElement('div');
    actions.className = 'book-actions';

    const togglebutton = document.createElement('button');
    togglebutton.className = 'button-toggle';
    togglebutton.textContent = book.read ? 'Непрочитано' : 'Прочитано';
    togglebutton.addEventListener('click', async () => {
      try {
        await toggleRead(book.id, book.read);
        await loadBooks();
      } catch (e) { showMessage(e.message); }
    });

    const delbutton = document.createElement('button');
    delbutton.className = 'button-delete';
    delbutton.textContent = 'Удалить';
    delbutton.addEventListener('click', async () => {
      if (confirm(`Удалить "${book.title}"?`)) {
        try {
          await deleteBook(book.id);
          await refreshAll();
          showMessage('Удалено', 'success');
        } catch (e) { showMessage(e.message); }
      }
    });

    actions.appendChild(togglebutton);
    actions.appendChild(delbutton);
    li.appendChild(info);
    li.appendChild(actions);
    listEl.appendChild(li);
  }

  updatePaginationUI();
}

function updatePaginationUI() {
  pageInfo.textContent = pagination.pages === 0
    ? '0 из 0'
    : `Страница ${pagination.page} из ${pagination.pages} (всего ${pagination.total})`;

  prevbutton.disabled = loading || filters.page <= 1;
  nextbutton.disabled = loading || filters.page >= pagination.pages;
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
    filters.page = 1;
    await refreshAll();
    showMessage('Книга добавлена', 'success');
  } catch (e) {
    showMessage(e.message);
  } finally {
    submitbutton.disabled = false;
  }
});

let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    filters.search = searchInput.value.trim();
    filters.page = 1;
    loadBooks();
  }, 350);
});

readFilter.addEventListener('change', () => {
  filters.read = readFilter.value;
  filters.page = 1;
  loadBooks();
});

sortSelect.addEventListener('change', () => {
  const [sort, order] = sortSelect.value.split(':');
  filters.sort = sort;
  filters.order = order;
  filters.page = 1;
  loadBooks();
});

limitSelect.addEventListener('change', () => {
  filters.limit = Number(limitSelect.value);
  filters.page = 1;
  loadBooks();
});

prevbutton.addEventListener('click', () => {
  if (filters.page > 1) {
    filters.page -= 1;
    loadBooks();
  }
});

nextbutton.addEventListener('click', () => {
  if (filters.page < pagination.pages) {
    filters.page += 1;
    loadBooks();
  }
});

loadBooks();

// ============ ЛР9: полки и перенос ============

let shelves = [];

async function loadShelves() {
  shelves = await request('/api/shelves');
  renderShelves();
  renderShelvesInForms();
}

function renderShelves() {
  const list = document.querySelector('#shelves-list');
  list.innerHTML = '';
  for (const shelf of shelves) {
    const li = document.createElement('li');
    li.textContent = `${shelf.name}: ${shelf.books_count} книг`;
    list.appendChild(li);
  }
}

function renderShelvesInForms() {
  const fromSel = document.querySelector('#transfer-from');
  const toSel   = document.querySelector('#transfer-to');

  for (const sel of [fromSel, toSel]) {
    sel.innerHTML = '';
    for (const shelf of shelves) {
      const opt = document.createElement('option');
      opt.value = shelf.id;
      opt.textContent = shelf.name;
      sel.appendChild(opt);
    }
  }

  if (shelves.length >= 2) {
    fromSel.value = shelves[0].id;
    toSel.value = shelves[1].id;
  }
}

async function loadBookOptionsForTransfer() {
  const all = await request('/api/books?limit=50&sort=title&order=asc');
  const sel = document.querySelector('#transfer-book');
  sel.innerHTML = '';
  for (const book of all.items) {
    const opt = document.createElement('option');
    opt.value = book.id;
    opt.textContent = `${book.title} (${book.shelf_name || 'без полки'})`;
    sel.appendChild(opt);
  }
}

async function loadHistory() {
  const rows = await request('/api/transfers');
  const list = document.querySelector('#history-list');
  list.innerHTML = '';
  if (rows.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Пока нет перемещений';
    list.appendChild(li);
    return;
  }
  for (const r of rows) {
    const li = document.createElement('li');
    li.textContent =
      `${r.book_title}: ${r.from_shelf_name} → ${r.to_shelf_name}`;
    list.appendChild(li);
  }
}

async function transferBook(bookId, fromShelfId, toShelfId) {
  return request('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bookId, fromShelfId, toShelfId })
  });
}

document.querySelector('#transfer-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const bookId = Number(document.querySelector('#transfer-book').value);
  const fromShelfId = Number(document.querySelector('#transfer-from').value);
  const toShelfId = Number(document.querySelector('#transfer-to').value);

  if (fromShelfId === toShelfId) {
    showMessage('Полки должны различаться');
    return;
  }

  try {
    await transferBook(bookId, fromShelfId, toShelfId);
    showMessage('Книга перенесена', 'success');
    await refreshAll();
  } catch (e) {
    showMessage(e.message);
  }
});

// Запуск ЛР9 при загрузке
(async function initL() {
  await loadShelves();
  await loadBookOptionsForTransfer();
  await loadHistory();
})();

async function refreshAll() {
  await Promise.all([
    loadShelves(),
    loadBooks(),
    loadBookOptionsForTransfer(),
    loadHistory()
  ]);
}