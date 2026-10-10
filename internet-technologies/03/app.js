const API_URL = 'https://jsonplaceholder.typicode.com/users';

const state = {
  users: [],
  isLoading: false,
  error: null,
  filter: ''
};

const loadButton = document.querySelector('#loadButton');
const reloadButton = document.querySelector('#reloadButton');
const filterInput = document.querySelector('#filterInput');

const statusElement = document.querySelector('#status');
const statisticsElement = document.querySelector('#statistics');
const usersElement = document.querySelector('#users');


// 1. Загрузка данных

async function loadUsers() {
  state.isLoading = true;
  state.error = null;
  render();

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const users = await response.json();
    state.users = users;
  } catch (err) {
    state.error = err.message;
    state.users = [];
  } finally {
    state.isLoading = false;
    render();
  }
}


// 2. Фильтрация

function getFilteredUsers(users, filter) {
  const f = filter.trim().toLowerCase();
  if (f === '') return users.slice();

  return users.filter(user =>
    user.name.toLowerCase().includes(f) ||
    user.username.toLowerCase().includes(f) ||
    user.email.toLowerCase().includes(f)
  );
}


// 3. Карточка пользователя

function createUserCard(user) {
  const article = document.createElement('article');
  article.className = 'user-card';

  const title = document.createElement('h3');
  title.className = 'user-card__name';
  title.textContent = user.name;
  article.appendChild(title);

  const fields = [
    ['username', '@' + user.username],
    ['email',    user.email],
    ['город',    user.address.city],
    ['компания', user.company.name]
  ];

  for (const [label, value] of fields) {
    const p = document.createElement('p');
    p.className = 'user-card__row';

    const span = document.createElement('span');
    span.className = 'user-card__label';
    span.textContent = label + ': ';

    p.appendChild(span);
    p.appendChild(document.createTextNode(value));
    article.appendChild(p);
  }

  return article;
}


// 4. Статистика

function getStatistics(users, filteredUsers) {
  const uniqueCities = new Set(users.map(u => u.address.city));

  return {
    total: users.length,
    visible: filteredUsers.length,
    uniqueCities: uniqueCities.size
  };
}


// 5. Отображение

function render() {
  usersElement.innerHTML = '';
  statisticsElement.textContent = '';

  if (state.isLoading) {
    statusElement.className = 'status status--loading';
    statusElement.textContent = 'Загрузка...';
    return;
  }

  if (state.error) {
    statusElement.className = 'status status--error';
    statusElement.textContent = 'Ошибка: ' + state.error;
    return;
  }

  if (state.users.length === 0) {
    statusElement.className = 'status';
    statusElement.textContent = 'Данные ещё не загружены.';
    return;
  }

  statusElement.className = 'status';
  statusElement.textContent = '';

  const filteredUsers = getFilteredUsers(state.users, state.filter);

  if (filteredUsers.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Ничего не найдено';
    usersElement.appendChild(empty);
  } else {
    for (const user of filteredUsers) {
      usersElement.appendChild(createUserCard(user));
    }
  }

  const stats = getStatistics(state.users, filteredUsers);
  statisticsElement.textContent =
    `Всего: ${stats.total} | Отображается: ${stats.visible} | Уникальных городов: ${stats.uniqueCities}`;
}


// 6. События

loadButton.addEventListener('click', () => {
  loadUsers();
});

reloadButton.addEventListener('click', () => {
  loadUsers();
});

filterInput.addEventListener('input', event => {
  state.filter = event.target.value;
  render();
});

render();