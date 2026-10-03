const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 10;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;


let stepsTable = [];

let currentPixels = [];

function putPixel(x, y, color = '#000000') {
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
    currentPixels.push({ x, y });
}

function lineDDA(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
        putPixel(x1, y1);
        return;
    }

    const xStep = dx / steps;
    const yStep = dy / steps;

    let x = x1;
    let y = y1;

    for (let i = 0; i <= steps; i += 1) {
        putPixel(Math.round(x), Math.round(y));
        x += xStep;
        y += yStep;
    }
}

function lineBresenham(x1, y1, x2, y2) {
    stepsTable = [];

    let x = x1;
    let y = y1;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;

    let error = dx - dy;
    let step = 0;

    while (true) {
        putPixel(x, y);

        stepsTable.push({
            step: step,
            x: x,
            y: y,
            error: error,
            error2: 2 * error,
            changed: ''
        });

        if (x === x2 && y === y2) break;

        const error2 = 2 * error;
        const changedParts = [];

        if (error2 > -dy) {
            error -= dy;
            x += sx;
            changedParts.push('x');
        }

        if (error2 < dx) {
            error += dx;
            y += sy;
            changedParts.push('y');
        }

        stepsTable[stepsTable.length - 1].changed = changedParts.join(', ');

        step++;
    }
}

function renderPixelsList() {
    const list = document.getElementById('pixels-list');
    list.innerHTML = '';
    for (const p of currentPixels) {
        const li = document.createElement('li');
        li.textContent = `(${p.x}, ${p.y})`;
        list.appendChild(li);
    }
}

function renderStepsTable() {
    const tbody = document.querySelector('#steps tbody');
    tbody.innerHTML = '';

    for (const s of stepsTable) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.step}</td>
            <td>${s.x}</td>
            <td>${s.y}</td>
            <td>${s.error}</td>
            <td>${s.error2}</td>
            <td>${s.changed}</td>
        `;
        tbody.appendChild(tr);
    }
}

const inputX1 = document.getElementById('x1');
const inputY1 = document.getElementById('y1');
const inputX2 = document.getElementById('x2');
const inputY2 = document.getElementById('y2');
const algorithmSelect = document.getElementById('algorithm');
const buildButton = document.getElementById('build');
const stepsSection = document.getElementById('steps-section');

function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function render() {
    clearCanvas();
    currentPixels = [];
    stepsTable = [];

    const x1 = parseInt(inputX1.value, 10);
    const y1 = parseInt(inputY1.value, 10);
    const x2 = parseInt(inputX2.value, 10);
    const y2 = parseInt(inputY2.value, 10);

    const algo = algorithmSelect.value;

    if (algo === 'dda') {
        lineDDA(x1, y1, x2, y2);
        stepsSection.classList.add('hidden');
    } else {
        lineBresenham(x1, y1, x2, y2);
        stepsSection.classList.remove('hidden');
        renderStepsTable();
    }

    renderPixelsList();
}

buildButton.addEventListener('click', render);

document.getElementById('test').addEventListener('click', () => {
    const N = 1000;

    const segments = [];
    for (let i = 0; i < N; i++) {
        segments.push({
            x1: Math.floor(Math.random() * GRID_W),
            y1: Math.floor(Math.random() * GRID_H),
            x2: Math.floor(Math.random() * GRID_W),
            y2: Math.floor(Math.random() * GRID_H)
        });
    }

    currentPixels = [];
    clearCanvas();

    const start1 = performance.now();
    for (const s of segments) {
        currentPixels = [];
        stepsTable = [];
        lineBresenham(s.x1, s.y1, s.x2, s.y2);
    }
    const end1 = performance.now();
    console.log('ЦДА: ', end1 - start1);

    currentPixels = [];
    stepsTable = [];
    clearCanvas();

    const start2 = performance.now();
    for (const s of segments) {
        currentPixels = [];
        stepsTable = [];
        lineBresenham(s.x1, s.y1, s.x2, s.y2);
    }
    const end2 = performance.now();
    console.log('Брезенхем: ', end2 - start2);

    render();
});

render();