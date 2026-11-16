const CUBE_VERTICES = [
  { x: -1, y: -1, z: -1 },
  { x:  1, y: -1, z: -1 },
  { x:  1, y:  1, z: -1 },
  { x: -1, y:  1, z: -1 },
  { x: -1, y: -1, z:  1 },
  { x:  1, y: -1, z:  1 },
  { x:  1, y:  1, z:  1 },
  { x: -1, y:  1, z:  1 }
];

const CUBE_EDGES = [
  [0,1], [1,2], [2,3], [3,0],
  [4,5], [5,6], [6,7], [7,4],
  [0,4], [1,5], [2,6], [3,7]
];

const PYRAMID_VERTICES = [
  { x: -1, y: -1, z: -1 },
  { x:  1, y: -1, z: -1 },
  { x:  1, y: -1, z:  1 },
  { x: -1, y: -1, z:  1 },
  { x:  0, y:  1, z: 0 }
];

const PYRAMID_EDGES = [
  [0,1], [1,2], [2,3], [3,0],
  [0,4], [1,4], [2,4], [3,4]
];

function translation3D(tx, ty, tz) {
  return [
    [1,0,0,tx],
    [0,1,0,ty],
    [0,0,1,tz],
    [0,0,0, 1]
  ];
}

function scaling3D(sx, sy, sz) {
  return [
    [sx,0,0,0],
    [0,sy,0,0],
    [0,0,sz,0],
    [0,0,0, 1]
  ];
}

function rotationX(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [1, 0, 0, 0],
    [0, c,-s, 0],
    [0, s, c, 0],
    [0, 0, 0, 1]
  ];
}

function rotationY(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [ c, 0, s, 0],
    [ 0, 1, 0, 0],
    [-s, 0, c, 0],
    [ 0, 0, 0, 1]
  ];
}

function rotationZ(degrees) {
  const a = degrees * Math.PI / 180;
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c,-s, 0, 0],
    [s, c, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1]
  ];
}

function multiply4(a, b) {
  const result = Array.from({ length: 4 }, () => [0,0,0,0]);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      for (let k = 0; k < 4; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

function transform3D(m, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      r[i] += m[i][j] * v[j];
    }
  }
  return { x: r[0], y: r[1], z: r[2], w: r[3] };
}


function projectOrtho(p, width, height, scale) {
  return {
    x: width / 2 + p.x * scale,
    y: height / 2 - p.y * scale
  };
}

function projectPerspective(p, width, height, focal) {
  if (p.z <= 0) return null;
  return {
    x: width / 2 + focal * p.x / p.z,
    y: height / 2 - focal * p.y / p.z
  };
}

function clipEdgeNear(a, b, near = 0.1) {
  const inA = a.z >= near;
  const inB = b.z >= near;

  if (!inA && !inB) return null;
  if (inA && inB) return [a, b];

  const t = (near - a.z) / (b.z - a.z);
  const cut = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: near
  };
  return inA ? [a, cut] : [cut, b];
}


const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

let currentModel = 'cube';
let isAnimating = true;
let angleY = 0;
let lastTime = null;

function getModel() {
  return currentModel === 'cube'
    ? { vertices: CUBE_VERTICES, edges: CUBE_EDGES }
    : { vertices: PYRAMID_VERTICES, edges: PYRAMID_EDGES };
}

function buildModelMatrix() {
  const rotX = Number(document.querySelector('#rot-x').value);
  const rotY = Number(document.querySelector('#rot-y').value) + angleY;
  const rotZ = Number(document.querySelector('#rot-z').value);
  const sc   = Number(document.querySelector('#scale').value);
  const tz   = Number(document.querySelector('#tz').value);

  let M = scaling3D(sc, sc, sc);
  M = multiply4(rotationX(rotX), M);
  M = multiply4(rotationY(rotY), M);
  M = multiply4(rotationZ(rotZ), M);
  M = multiply4(translation3D(0, 0, tz), M);

  return M;
}

function drawScene() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const model = getModel();
  const M = buildModelMatrix();

  const points3D = model.vertices.map(v => transform3D(M, v));

  const isPerspective = document.querySelector('input[name="projection"]:checked').value === 'perspective';
  const focal = Number(document.querySelector('#focal').value);
  const orthoScale = 75;
  const near = 0.1;

  ctx.strokeStyle = '#dc3545';
  ctx.lineWidth = 2;

  for (const [i, j] of model.edges) {
    const clipped = clipEdgeNear(points3D[i], points3D[j], near);
    if (!clipped) continue;
    const [a, b] = clipped;

    const pa = isPerspective
      ? projectPerspective(a, canvas.width, canvas.height, focal)
      : projectOrtho(a, canvas.width, canvas.height, orthoScale);
    const pb = isPerspective
      ? projectPerspective(b, canvas.width, canvas.height, focal)
      : projectOrtho(b, canvas.width, canvas.height, orthoScale);

    if (!pa || !pb) continue;

    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  updateVertexInfo();
  renderMatrix(M);
}

function updateVertexInfo() {
  const v0 = { x: 1, y: 1, z: 1 };

  const M = buildModelMatrix();
  const v1 = transform3D(M, v0);

  document.querySelector('#vx0').textContent = v0.x.toFixed(2);
  document.querySelector('#vy0').textContent = v0.y.toFixed(2);
  document.querySelector('#vz0').textContent = v0.z.toFixed(2);

  document.querySelector('#vx1').textContent = v1.x.toFixed(2);
  document.querySelector('#vy1').textContent = v1.y.toFixed(2);
  document.querySelector('#vz1').textContent = v1.z.toFixed(2);

  const isPerspective = document.querySelector('input[name="projection"]:checked').value === 'perspective';
  const focal = Number(document.querySelector('#focal').value);
  const orthoScale = 75;

  let screen;
  if (isPerspective) {
    screen = projectPerspective(v1, canvas.width, canvas.height, focal);
    if (!screen) {
      document.querySelector('#screen-output').textContent = 'Невидима';
      return;
    }
  } else {
    screen = projectOrtho(v1, canvas.width, canvas.height, orthoScale);
  }

  document.querySelector('#screen-output').textContent =
    `Экранные координаты: (${screen.x.toFixed(1)}, ${screen.y.toFixed(1)})`;
}


function renderMatrix(m) {
  const text = m.map(row =>
    row.map(v => v.toFixed(3).padStart(8)).join(' ')
  ).join('\n');
  document.querySelector('#matrix-output').textContent = text;
}


document.querySelector('#model-select').addEventListener('change', (e) => {
  currentModel = e.target.value;
  initVertexSelect();
});

for (const id of ['rot-x', 'rot-y', 'rot-z', 'scale', 'tz', 'focal']) {
  document.querySelector(`#${id}`).addEventListener('input', drawScene);
}

document.querySelectorAll('input[name="projection"]').forEach(el => {
  el.addEventListener('change', drawScene);
});

document.querySelector('#btn-toggle-anim').addEventListener('click', (e) => {
  isAnimating = !isAnimating;
  e.target.textContent = isAnimating ? 'Пауза' : 'Продолжить';
});

document.querySelector('#btn-reset').addEventListener('click', () => {
  document.querySelector('#rot-x').value = 0;
  document.querySelector('#rot-y').value = 0;
  document.querySelector('#rot-z').value = 0;
  document.querySelector('#scale').value = 1;
  document.querySelector('#tz').value = 5;
  document.querySelector('#focal').value = 300;
  document.querySelector('input[name="projection"][value="perspective"]').checked = true;
  angleY = 0;
  isAnimating = false;
  document.querySelector('#btn-toggle-anim').textContent = 'Продолжить';
  drawScene();
});

function frame(timestamp) {
  if (lastTime !== null && isAnimating) {
    const dt = (timestamp - lastTime) / 1000;
    angleY += 30 * dt;
  }
  lastTime = timestamp;

  drawScene();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);