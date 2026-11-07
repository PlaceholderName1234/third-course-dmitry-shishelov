const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 15;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

const DEFAULT_VERTICES = [
  { x: 5, y: 10 },
  { x: 20, y: 5  },
  { x: 35, y: 10 },
  { x: 25, y: 25 },
  { x: 15, y: 25 }
];

function initVertexInputs() {
  const container = document.querySelector('#vertices-inputs');
  container.innerHTML = '';

  DEFAULT_VERTICES.forEach((v, i) => {
    const row = document.createElement('div');
    row.className = 'vertex-row';
    row.innerHTML = `
      <span>P${i}</span>
      x: <input type="number" class="vertex-x" value="${v.x}" data-index="${i}">
      y: <input type="number" class="vertex-y" value="${v.y}" data-index="${i}">
    `;
    container.appendChild(row);
  });
}

function getOriginalPolygon() {
  const xs = document.querySelectorAll('.vertex-x');
  const ys = document.querySelectorAll('.vertex-y');
  const points = [];
  for (let i = 0; i < xs.length; i++) {
    points.push({
      x: Number(xs[i].value),
      y: Number(ys[i].value)
    });
  }
  return points;
}

function translation(tx, ty) {
  return [
    [1, 0, tx],
    [0, 1, ty],
    [0, 0, 1]
  ];
}

function scaling(sx, sy) {
  return [
    [sx, 0, 0],
    [0, sy, 0],
    [0, 0, 1]
  ];
}

function rotation(degrees) {
  const angle = degrees * Math.PI / 180;
  const c = Math.cos(angle);
  const s = Math.sin(angle);

  return [
    [c, -s, 0],
    [s,  c, 0],
    [0,  0, 1]
  ];
}

function transformPoint(m, p) {
  return {
    x: m[0][0] * p.x + m[0][1] * p.y + m[0][2],
    y: m[1][0] * p.x + m[1][1] * p.y + m[1][2]
  };
}

function multiplyMatrices(a, b) {
  const result = Array.from(
    { length: 3 },
    () => [0, 0, 0]
  );

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }

  return result;
}

function buildMatrix(params) {
  const { tx, ty, sx, sy, angle, cx, cy, order } = params;

  const S_c = multiplyMatrices(
    multiplyMatrices(translation(cx, cy), scaling(sx, sy)),
    translation(-cx, -cy)
  );

  const R_c = multiplyMatrices(
    multiplyMatrices(translation(cx, cy), rotation(angle)),
    translation(-cx, -cy)
  );

  const T = translation(tx, ty);

  if (order === 'TR') {
    return multiplyMatrices(multiplyMatrices(T, R_c), S_c);
  } else {
    return multiplyMatrices(multiplyMatrices(R_c, T), S_c);
  }
}

function putPixel(x, y, color = '#000000') {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx < 0 || rx >= GRID_W || ry < 0 || ry >= GRID_H) return;
  ctx.fillStyle = color;
  ctx.fillRect(rx * SCALE, ry * SCALE, SCALE, SCALE);
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

function drawMarker(x, y, color = '#ff9800') {
  const rx = Math.round(x);
  const ry = Math.round(y);
  ctx.fillStyle = color;
  ctx.fillRect(rx * SCALE, ry * SCALE, SCALE, SCALE);
}

function render(originalPolygon, resultPolygon, center) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawPolygon(originalPolygon, '#aaaaaa');
  drawPolygon(resultPolygon, '#dc3545');
  drawMarker(center.x, center.y);
}

function renderTable(originalPolygon, resultPolygon) {
  const tbody = document.querySelector('#vertices-table tbody');
  tbody.innerHTML = '';
  for (let i = 0; i < originalPolygon.length; i++) {
    const o = originalPolygon[i];
    const n = resultPolygon[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>P${i}</td>
      <td>${o.x.toFixed(2)}</td>
      <td>${o.y.toFixed(2)}</td>
      <td>${n.x.toFixed(2)}</td>
      <td>${n.y.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderMatrix(m) {
  const lines = m.map(row =>
    row.map(v => v.toFixed(2).padStart(6)).join(' ')
  ).join('\n');
  document.querySelector('#matrix-output').textContent = lines;
}

function update() {
  const originalPolygon = getOriginalPolygon();

  const params = {
    tx: Number(document.querySelector('#tx').value),
    ty: Number(document.querySelector('#ty').value),
    sx: Number(document.querySelector('#sx').value),
    sy: Number(document.querySelector('#sy').value),
    angle: Number(document.querySelector('#angle').value),
    cx: Number(document.querySelector('#cx').value),
    cy: Number(document.querySelector('#cy').value),
    order: document.querySelector('input[name="order"]:checked').value
  };

  const M = buildMatrix(params);
  const resultPolygon = originalPolygon.map(p => transformPoint(M, p));

  render(originalPolygon, resultPolygon, { x: params.cx, y: params.cy });
  renderTable(originalPolygon, resultPolygon);
  renderMatrix(M);
}

document.querySelector('#btn-apply').addEventListener('click', update);

document.querySelector('#btn-reset').addEventListener('click', () => {
  document.querySelector('#tx').value = 0;
  document.querySelector('#ty').value = 0;
  document.querySelector('#sx').value = 1;
  document.querySelector('#sy').value = 1;
  document.querySelector('#angle').value = 0;
  document.querySelector('#cx').value = 20;
  document.querySelector('#cy').value = 15;
  document.querySelector('input[name="order"][value="TR"]').checked = true;

  initVertexInputs();
  update();
});

document.querySelector('#vertices-inputs').addEventListener('input', update);

initVertexInputs();
update();