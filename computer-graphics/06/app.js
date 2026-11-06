const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 15;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

const originalPolygon = [
  { x: 5, y: 15 },
  { x: 20, y: 5 },
  { x: 35, y: 15 },
  { x: 30, y: 25 },
  { x: 20, y: 15 },
  { x: 10, y: 25 }
];

// const originalPolygon = [
//   { x: 15, y: 5 },
//   { x: 25, y: 15 },
//   { x: 15, y: 25 },
//   { x: 5, y: 15 },
// ];

// const originalPolygon = [
//   { x: 5, y: 5 },
//   { x: 20, y: 5 },
//   { x: 20, y: 20 },
//   { x: 5, y: 20 },
// ];

function intersectVertical(a, b, xBoundary) {
  const t = (xBoundary - a.x) / (b.x - a.x);

  return {
    x: xBoundary,
    y: a.y + t * (b.y - a.y)
  };
}

function intersectHorizontal(a, b, yBoundary) {
  const t = (yBoundary - a.y) / (b.y - a.y);

  return {
    x: a.x + t * (b.x - a.x),
    y: yBoundary
  };
}

function clipAgainstBoundary(polygon, isInside, getIntersection) {
  const output = [];

  if (polygon.length === 0) {
    return output;
  }

  let s = polygon[polygon.length - 1];

  for (const p of polygon) {
    const sInside = isInside(s);
    const pInside = isInside(p);

    if (sInside && pInside) {
      output.push(p);
    } else if (sInside && !pInside) {
      output.push(getIntersection(s, p));
    } else if (!sInside && pInside) {
      output.push(getIntersection(s, p));
      output.push(p);
    }

    s = p;
  }
  return output;
}

function clipPolygon(polygon, rect) {
  let result = polygon;
  const stages = {};
  stages.original = [...result];

  result = clipAgainstBoundary(
    result,
    p => p.x >= rect.xmin,
    (a, b) => intersectVertical(a, b, rect.xmin)
  );
  stages.left = [...result];

  result = clipAgainstBoundary(
    result,
    p => p.x <= rect.xmax,
    (a, b) => intersectVertical(a, b, rect.xmax)
  );
  stages.right = [...result];

  result = clipAgainstBoundary(
    result,
    p => p.y >= rect.ymin,
    (a, b) => intersectHorizontal(a, b, rect.ymin)
  );
  stages.top = [...result];

  result = clipAgainstBoundary(
    result,
    p => p.y <= rect.ymax,
    (a, b) => intersectHorizontal(a, b, rect.ymax)
  );
  stages.bottom = [...result];

  return { result, stages };
}

function putPixel(x, y, color = '#000000') {
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
  ctx.fillStyle = color;
  ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function drawLineBresenham(x1, y1, x2, y2, color = '#000000') {
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  x2 = Math.round(x2);
  y2 = Math.round(y2);

  let x = x1;
  let y = y1;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;

  let error = dx - dy;

  while (true) {
    putPixel(x, y, color);

    if (x === x2 && y === y2) {
      break;
    }

    const error2 = 2 * error;

    if (error2 > -dy) {
      error -= dy;
      x += sx;
    }

    if (error2 < dx) {
      error += dx;
      y += sy;
    }
  }
}

function drawPolygon(points, color = '#000000') {
  if (points.length < 2) return;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    drawLineBresenham(a.x, a.y, b.x, b.y, color);
  }
}

function drawRect(rect, color = '#cccccc') {
  drawLineBresenham(rect.xmin, rect.ymin, rect.xmax, rect.ymin, color);
  drawLineBresenham(rect.xmax, rect.ymin, rect.xmax, rect.ymax, color);
  drawLineBresenham(rect.xmax, rect.ymax, rect.xmin, rect.ymax, color);
  drawLineBresenham(rect.xmin, rect.ymax, rect.xmin, rect.ymin, color);
}

function getRect() {
  const xmin = Number(document.querySelector('#xmin').value);
  const xmax = Number(document.querySelector('#xmax').value);
  const ymin = Number(document.querySelector('#ymin').value);
  const ymax = Number(document.querySelector('#ymax').value);

  if (xmin >= xmax || ymin >= ymax) {
    alert('Неверные параметры окна: должно быть xmin < xmax и ymin < ymax');
    return null;
  }
  return { xmin, xmax, ymin, ymax };
}

let currentStages = null;

function render(stageKey = 'bottom') {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rect = getRect();
  if (!rect) return;

  drawPolygon(originalPolygon, '#aaaaaa');

  drawRect(rect, '#007bff');

  if (currentStages && currentStages[stageKey]) {
    const poly = currentStages[stageKey];
    if (poly.length >= 2) {
      drawPolygon(poly, '#dc3545');
    }
  }
}

function updateTable(stages) {
  const tbody = document.querySelector('#results-table tbody');
  tbody.innerHTML = '';

  const names = {
    original: 'Исходный',
    left: 'LEFT',
    right: 'RIGHT',
    top: 'TOP',
    bottom: 'BOTTOM'
  };

  for (const key of ['original', 'left', 'right', 'top', 'bottom']) {
    const points = stages[key] || [];
    const coords = points.map(p => `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(', ');

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${names[key]}</td>
      <td>${points.length}</td>
      <td>${coords || '—'}</td>
    `;
    tbody.appendChild(tr);
  }
}

function update() {
  const rect = getRect();
  if (!rect) return;

  const { stages } = clipPolygon(originalPolygon, rect);
  currentStages = stages;

  updateTable(stages);

  const stageKey = document.querySelector('#stage-select').value;
  render(stageKey);
}

document.querySelector('#button-reset').addEventListener('click', () => {
  document.querySelector('#xmin').value = 10;
  document.querySelector('#xmax').value = 30;
  document.querySelector('#ymin').value = 5;
  document.querySelector('#ymax').value = 20;
  document.querySelector('#stage-select').value = 'bottom';
  update();
});

for (const id of ['xmin', 'xmax', 'ymin', 'ymax']) {
  document.querySelector('#' + id).addEventListener('change', update);
}


document.querySelector('#stage-select').addEventListener('change', () => {
  const stageKey = document.querySelector('#stage-select').value;
  render(stageKey);
});

update();