const state = {
  posts: [],
  isLoading: false,
  isSaving: false,
  error: null,
  filter: '',
  editingId: null
};

const API_URL = 'https://jsonplaceholder.typicode.com/posts?_limit=10';
const BASE_URL = 'https://jsonplaceholder.typicode.com/posts';

const statusEl        = document.querySelector('#status');
const statisticsEl    = document.querySelector('#statistics');
const postsEl         = document.querySelector('#posts');
const filterInput     = document.querySelector('#filterInput');
const loadButton      = document.querySelector('#loadButton');

const formEl          = document.querySelector('#postForm');
const formTitleEl     = document.querySelector('#formTitle');
const titleInput      = document.querySelector('#titleInput');
const bodyInput       = document.querySelector('#bodyInput');
const submitButton    = document.querySelector('#submitButton');
const cancelButton    = document.querySelector('#cancelButton');

function getFilteredPosts(posts, filter) {
  const f = filter.trim().toLowerCase();
  if (f === '') return posts.slice();

  return posts.filter(post =>
    post.title.toLowerCase().includes(f) ||
    post.body.toLowerCase().includes(f)
  );
}

async function loadPosts() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const posts = await response.json();
    state.posts = posts;
  } catch (err) {
    state.error = err.message;
    state.posts = [];
  } finally {
    state.isLoading = false;
    render();
  }
}

async function createPost(data) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const created = await response.json();

    state.posts = [created, ...state.posts];
    resetForm();
  } catch (err) {
    state.error = err.message;
  } finally {
    state.isSaving = false;
    render();
  }
}

async function updatePost(id, data) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const updated = await response.json();

    state.posts = state.posts.map(post =>
      post.id === id ? { ...post, ...updated, id } : post
    );
    resetForm();
  } catch (err) {
    state.error = err.message;
  } finally {
    state.isSaving = false;
    render();
  }
}

async function deletePost(id) {
  state.isSaving = true;
  state.error = null;
  render();

  try {
    const response = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    state.posts = state.posts.filter(post => post.id !== id);
  } catch (err) {
    state.error = err.message;
  } finally {
    state.isSaving = false;
    render();
  }
}

function resetForm() {
  state.editingId = null;
  titleInput.value = '';
  bodyInput.value = '';
  formTitleEl.textContent = 'Новая публикация';
  submitButton.textContent = 'Сохранить';
}

function createPostCard(post) {
  const card = document.createElement('article');
  card.className = 'post-card';
  if (post.id === state.editingId) {
    card.classList.add('post-card--editing');
  }

  const header = document.createElement('div');
  header.className = 'post-card__header';

  const idSpan = document.createElement('span');
  idSpan.className = 'post-card__id';
  idSpan.textContent = `#${post.id}`;
  header.appendChild(idSpan);

  const title = document.createElement('h3');
  title.className = 'post-card__title';
  title.textContent = post.title;
  card.appendChild(header);
  card.appendChild(title);

  const body = document.createElement('p');
  body.className = 'post-card__body';
  body.textContent = post.body;
  card.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'post-card__actions';

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Редактировать';
  editButton.disabled = state.isSaving;
  editButton.addEventListener('click', () => startEditing(post));
  actions.appendChild(editButton);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Удалить';
  deleteButton.disabled = state.isSaving;
  deleteButton.addEventListener('click', () => deletePost(post.id));
  actions.appendChild(deleteButton);

  card.appendChild(actions);
  return card;
}

function renderPosts(posts) {
  postsEl.innerHTML = '';

  if (posts.length === 0) {
    const p = document.createElement('p');
    p.textContent = 'Публикации не найдены';
    postsEl.appendChild(p);
    return;
  }

  for (const post of posts) {
    postsEl.appendChild(createPostCard(post));
  }
}

function render() {
  if (state.isSaving) {
    statusEl.className = 'status status--loading';
    statusEl.textContent = 'Сохранение...';
  } else if (state.isLoading) {
    statusEl.className = 'status status--loading';
    statusEl.textContent = 'Загрузка...';
  } else if (state.error) {
    statusEl.className = 'status status--error';
    statusEl.textContent = 'Ошибка: ' + state.error;
  } else if (state.posts.length === 0) {
    statusEl.className = 'status';
    statusEl.textContent = 'Данные ещё не загружены.';
  } else {
    statusEl.className = 'status';
    statusEl.textContent = '';
  }

  submitButton.disabled = state.isSaving;
  cancelButton.disabled = state.isSaving;
  loadButton.disabled = state.isSaving || state.isLoading;

  const filtered = getFilteredPosts(state.posts, state.filter);
  statisticsEl.textContent = state.posts.length === 0
    ? ''
    : `Всего: ${state.posts.length} | Отображается: ${filtered.length}`;

  if (state.isLoading || state.posts.length === 0) {
    postsEl.innerHTML = '';
  } else {
    renderPosts(filtered);
  }
}

function startEditing(post) {
  state.editingId = post.id;
  titleInput.value = post.title;
  bodyInput.value = post.body;
  formTitleEl.textContent = `Редактирование #${post.id}`;
  submitButton.textContent = 'Сохранить изменения';
  render();
}

loadButton.addEventListener('click', loadPosts);

filterInput.addEventListener('input', (event) => {
  state.filter = event.target.value;
  render();
});

formEl.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title || !body) {
    state.error = 'Заполните заголовок и текст';
    render();
    return;
  }

  state.error = null;
  const data = { title, body, userId: 1 };

  if (state.editingId === null) {
    createPost(data);
  } else {
    updatePost(state.editingId, data);
  }
});

cancelButton.addEventListener('click', () => {
  state.error = null;
  resetForm();
  render();
});

render();
loadPosts();