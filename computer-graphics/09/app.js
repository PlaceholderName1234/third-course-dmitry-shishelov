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
  [0,1],[1,2],[2,3],[3,0],
  [4,5],[5,6],[6,7],[7,4],
  [0,4],[1,5],[2,6],[3,7]
];

const CUBE_TRIANGLES = [
  [0,2,1],[0,3,2],
  [4,5,6],[4,6,7],
  [0,1,5],[0,5,4],
  [3,7,6],[3,6,2],
  [0,4,7],[0,7,3],
  [1,2,6],[1,6,5]
];

const PYRAMID_VERTICES = [
  { x: -1, y: -1, z: -1 },
  { x:  1, y: -1, z: -1 },
  { x:  1, y: -1, z:  1 },
  { x: -1, y: -1, z:  1 },
  { x:  0, y:  1, z:  0 }
];

const PYRAMID_EDGES = [
  [0,1],[1,2],[2,3],[3,0],
  [0,4],[1,4],[2,4],[3,4]
];

const PYRAMID_TRIANGLES = [
  [0,1,4],[1,2,4],[2,3,4],[3,0,4],
  [0,3,2],[0,2,1]
];

function translation3D(tx, ty, tz) {
  return [[1,0,0,tx],[0,1,0,ty],[0,0,1,tz],[0,0,0,1]];
}

function scaling3D(sx, sy, sz) {
  return [[sx,0,0,0],[0,sy,0,0],[0,0,sz,0],[0,0,0,1]];
}

function rotationX(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[1,0,0,0],[0,c,-s,0],[0,s,c,0],[0,0,0,1]];
}

function rotationY(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]];
}

function rotationZ(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return [[c,-s,0,0],[s,c,0,0],[0,0,1,0],[0,0,0,1]];
}

function multiply4(a, b) {
  const r = Array.from({length:4}, () => [0,0,0,0]);
  for (let i=0;i<4;i++) for (let j=0;j<4;j++) for (let k=0;k<4;k++)
    r[i][j] += a[i][k] * b[k][j];
  return r;
}

function transform3D(m, p) {
  const v = [p.x, p.y, p.z, 1];
  const r = [0,0,0,0];
  for (let i=0;i<4;i++) for (let j=0;j<4;j++) r[i] += m[i][j]*v[j];
  return { x: r[0], y: r[1], z: r[2], w: r[3] };
}

function projectOrtho(p, width, height, scale) {
  return { x: width/2 + p.x*scale, y: height/2 - p.y*scale, z: p.z };
}

function projectPerspective(p, width, height, focal) {
  if (p.z <= 0) return null;
  return { x: width/2 + focal*p.x/p.z, y: height/2 - focal*p.y/p.z, z: p.z };
}

function cutNear(a, b, near) {
  const t = (near - a.z) / (b.z - a.z);
  return {
    x: a.x + t*(b.x - a.x),
    y: a.y + t*(b.y - a.y),
    z: near
  };
}

function clipPolygonNear(vertices, near) {
  const output = [];
  if (vertices.length === 0) return output;

  let s = vertices[vertices.length - 1];
  for (const p of vertices) {
    const sIn = s.z >= near;
    const pIn = p.z >= near;

    if (sIn && pIn) output.push(p);
    else if (sIn && !pIn) output.push(cutNear(s, p, near));
    else if (!sIn && pIn) output.push(cutNear(s, p, near), p);

    s = p;
  }
  return output;
}

function triangulateFan(vertices) {
  const result = [];
  for (let i = 1; i + 1 < vertices.length; i++) {
    result.push([vertices[0], vertices[i], vertices[i+1]]);
  }
  return result;
}

function edge(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

function barycentric(a, b, c, p) {
  const area = edge(a, b, c);
  if (Math.abs(area) < 1e-12) return null;

  const wa = edge(b, c, p) / area;
  const wb = edge(c, a, p) / area;
  const wc = edge(a, b, p) / area;

  return { wa, wb, wc };
}

function depthAt(w, a, b, c, perspective) {
  if (!perspective) {
    return w.wa*a.z + w.wb*b.z + w.wc*c.z;
  }
  const invZ = w.wa/a.z + w.wb/b.z + w.wc/c.z;
  return 1 / invZ;
}

function putPixel(pixels, width, x, y, color) {
  const offset = 4 * (y * width + x);

  pixels[offset] = color[0];     // R
  pixels[offset + 1] = color[1]; // G
  pixels[offset + 2] = color[2]; // B
  pixels[offset + 3] = 255;      // A
}

function rasterTriangle(a, b, c, color, image, depth, perspective) {
  const width = image.width;
  const height = image.height;
  const left   = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const right  = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const top    = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

  let accepted = 0;

  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      const weights = barycentric(a, b, c, {
        x: x + 0.5,
        y: y + 0.5
      });

      if (!weights ) continue;

      const eps = 1e-9;
      if (weights.wa < -eps || weights.wb < -eps || weights.wc < -eps) {
        continue;
      }

      const z = depthAt(weights , a, b, c, perspective);
      if (!Number.isFinite(z) || z <= 0) continue;

      const index = y * width + x;
      if (z < depth[index]) {
        depth[index] = z;
        putPixel(image.data, width, x, y, color);
        accepted++;
      }
    }
  }
  return accepted;
}


const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

let currentModel = 'cube';
let isAnimating = true;
let angleY = 0;
let lastTime = null;

function getModel() {
  return currentModel === 'cube'
    ? { vertices: CUBE_VERTICES, edges: CUBE_EDGES, triangles: CUBE_TRIANGLES }
    : { vertices: PYRAMID_VERTICES, edges: PYRAMID_EDGES, triangles: PYRAMID_TRIANGLES };
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

function drawWireframe(points3D, edges, isPerspective, focal, orthoScale, near) {
  ctx.strokeStyle = '#dc3545';
  ctx.lineWidth = 2;
  for (const [i, j] of edges) {
    const clipped = clipEdgeNear(points3D[i], points3D[j], near);
    if (!clipped) continue;
    const [a, b] = clipped;
    const pa = isPerspective ? projectPerspective(a, W, H, focal) : projectOrtho(a, W, H, orthoScale);
    const pb = isPerspective ? projectPerspective(b, W, H, focal) : projectOrtho(b, W, H, orthoScale);
    if (!pa || !pb) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
}

function clipEdgeNear(a, b, near) {
  const inA = a.z >= near, inB = b.z >= near;
  if (!inA && !inB) return null;
  if (inA && inB) return [a, b];
  const t = (near - a.z) / (b.z - a.z);
  const cut = { x: a.x + t*(b.x - a.x), y: a.y + t*(b.y - a.y), z: near };
  return inA ? [a, cut] : [cut, b];
}

const FACE_COLORS = [
  [250, 50, 50],
  [50, 150, 250],
  [50, 250, 50],
  [250, 150, 50],
  [150, 50, 250],
  [250, 150, 50],
  [200, 200, 200]
];

function drawFilled(points3D, triangles, isPerspective, focal, orthoScale, near) {
  const image = ctx.createImageData(W, H);
  const depth = new Float64Array(W * H);
  depth.fill(Infinity);
  image.data.fill(255);

  let totalTriangles = 0;
  let totalPixels = 0;

  for (let tIndex = 0; tIndex < triangles.length; tIndex++) {
    const [i, j, k] = triangles[tIndex];
    const color = FACE_COLORS[tIndex % FACE_COLORS.length];

    let poly = [points3D[i], points3D[j], points3D[k]];
    poly = clipPolygonNear(poly, near);
    if (poly.length < 3) continue;

    const parts = triangulateFan(poly);

    for (const tri of parts) {
      const [a3, b3, c3] = tri;

      const pa = isPerspective ? projectPerspective(a3, W, H, focal) : projectOrtho(a3, W, H, orthoScale);
      const pb = isPerspective ? projectPerspective(b3, W, H, focal) : projectOrtho(b3, W, H, orthoScale);
      const pc = isPerspective ? projectPerspective(c3, W, H, focal) : projectOrtho(c3, W, H, orthoScale);

      if (!pa || !pb || !pc) continue;

      const px = rasterTriangle(
        { x: pa.x, y: pa.y, z: a3.z },
        { x: pb.x, y: pb.y, z: b3.z },
        { x: pc.x, y: pc.y, z: c3.z },
        color, image, depth, isPerspective
      );
      totalTriangles++;
      totalPixels += px;
    }
  }

  ctx.putImageData(image, 0, 0);

  document.querySelector('#stats-output').textContent =
    `Треугольников отрисовано: ${totalTriangles}\n` +
    `Пикселей прошло проверку глубины: ${totalPixels}`;
}

function drawScene() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const model = getModel();
  const M = buildModelMatrix();
  const points3D = model.vertices.map(v => transform3D(M, v));

  const isPerspective = document.querySelector('input[name="projection"]:checked').value === 'perspective';
  const isFilled = document.querySelector('input[name="render-mode"]:checked').value === 'filled';
  const focal = Number(document.querySelector('#focal').value);
  const orthoScale = 75;
  const near = 0.1;

  if (isFilled) {
    drawFilled(points3D, model.triangles, isPerspective, focal, orthoScale, near);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    drawWireframe(points3D, model.edges, isPerspective, focal, orthoScale, near);
    document.querySelector('#stats-output').textContent = 'Каркасный режим';
  }
}

document.querySelector('#model-select').addEventListener('change', (e) => {
  currentModel = e.target.value;
});

for (const id of ['rot-x', 'rot-y', 'rot-z', 'scale', 'tz', 'focal']) {
  document.querySelector(`#${id}`).addEventListener('input', drawScene);
}

document.querySelectorAll('input[name="projection"], input[name="render-mode"]').forEach(el => {
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
  document.querySelector('input[name="projection"][value="ortho"]').checked = true;
  document.querySelector('input[name="render-mode"][value="wireframe"]').checked = true;
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