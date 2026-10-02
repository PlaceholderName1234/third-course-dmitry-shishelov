const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 10;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

let stepsTable = [];

function putPixel(x, y, color = '#000000') {
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function lineDDA(x1, y1, x2, y2) {
    stepsTable = [];

    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
        putPixel(x1, y1);
        stepsTable.push({ step: 0, xReal: x1, yReal: y1, px: x1, py: y1 });
        return;
    }

    const xStep = dx / steps;
    const yStep = dy / steps;

    let x = x1;
    let y = y1;

    for (let i = 0; i <= steps; i += 1) {
        const px = Math.round(x);
        const py = Math.round(y);

        putPixel(px, py);

        stepsTable.push({
            step: i,
            xReal: x.toFixed(3),
            yReal: y.toFixed(3),
            px: px,
            py: py
        });

        x += xStep;
        y += yStep;
    }
}

const inputX1 = document.getElementById('x1');
const inputY1 = document.getElementById('y1');
const inputX2 = document.getElementById('x2');
const inputY2 = document.getElementById('y2');
const buildButton = document.getElementById('build');
const tbody = document.querySelector('#steps tbody');

function renderStepsTable() {
    tbody.innerHTML = '';
    for (const s of stepsTable) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.step}</td>
            <td>${s.xReal}</td>
            <td>${s.yReal}</td>
            <td>${s.px}</td>
            <td>${s.py}</td>
        `;
        tbody.appendChild(tr);
    }
}

function build() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const x1 = parseInt(inputX1.value, 10);
    const y1 = parseInt(inputY1.value, 10);
    const x2 = parseInt(inputX2.value, 10);
    const y2 = parseInt(inputY2.value, 10);

    lineDDA(x1, y1, x2, y2);
    renderStepsTable();
}

buildButton.addEventListener('click', build);

build();