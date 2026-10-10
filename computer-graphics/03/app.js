const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 15;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

let stepsLog = [];

let midpointPixels = null;

function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function putPixel(x, y, color = '#000000') {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;

    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function plot8(cx, cy, x, y, highlightBase = false) {
    const baseColor   = highlightBase ? '#d81d1d' : '#000000';
    const symmColor = '#000000';

    const points = [
        [cx + x, cy + y, baseColor],
        [cx + y, cy + x, symmColor],
        [cx - x, cy + y, symmColor],
        [cx - y, cy + x, symmColor],
        [cx + x, cy - y, symmColor],
        [cx + y, cy - x, symmColor],
        [cx - x, cy - y, symmColor],
        [cx - y, cy - x, symmColor]
    ];

    for (const [px, py, color] of points) {
        putPixel(px, py, color);
        if (midpointPixels) {
            midpointPixels.add(px + ',' + py);
        }
    }
}

function circleMidpoint(cx, cy, r, options = {}) {
    const { log = false, highlightBase = false } = options;

    if (log) stepsLog = [];

    let x = 0;
    let y = r;
    let d = 1 - r;
    let step = 0;

    while (x <= y) {
        const dBefore = d;

        plot8(cx, cy, x, y, highlightBase);

        let branch;
        if (d < 0) {
            branch = 'E';
            d += 2 * x + 3;
        } else {
            branch = 'SE';
            d += 2 * (x - y) + 5;
            y -= 1;
        }

        if (log) {
            stepsLog.push({
                step: step,
                x: x,
                y: (branch === 'SE') ? y + 1 : y,
                dBefore: dBefore,
                branch: branch,
                dAfter: d
            });
        }

        x += 1;
        step += 1;
    }
}

function circleFormula(cx, cy, r, color = '#000000') {
    const pixels = new Set();

    function plot8Formula(x, y) {
        const points = [
            [cx + x, cy + y], [cx + y, cy + x],
            [cx - x, cy + y], [cx - y, cy + x],
            [cx + x, cy - y], [cx + y, cy - x],
            [cx - x, cy - y], [cx - y, cy - x]
        ];
        for (const [px, py] of points) {
            pixels.add(px + ',' + py);
            putPixel(px, py, color);
        }
    }

    for (let x = 0; x <= r; x++) {
        if (x > Math.round(Math.sqrt(r * r - x * x))) break;
        const y = Math.round(Math.sqrt(r * r - x * x));
        plot8Formula(x, y);
    }

    return pixels;
}

const cxInput      = document.querySelector('#cx');
const cyInput      = document.querySelector('#cy');
const rInput       = document.querySelector('#r');
const btnBuild     = document.querySelector('#btn-build');
const btnClear     = document.querySelector('#btn-clear');
const showSymmetry = document.querySelector('#show-symmetry');
const showFormula  = document.querySelector('#show-formula');
const tbody        = document.querySelector('#steps tbody');

function renderStepsTable() {
    tbody.innerHTML = '';
    for (const s of stepsLog) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.step}</td>
            <td>${s.x}</td>
            <td>${s.y}</td>
            <td>${s.dBefore}</td>
            <td>${s.branch}</td>
            <td>${s.dAfter}</td>
        `;
        tbody.appendChild(tr);
    }
}

function build() {
    clearCanvas();

    const cx = parseInt(cxInput.value, 10);
    const cy = parseInt(cyInput.value, 10);
    const r  = parseInt(rInput.value, 10);

    if (Number.isNaN(cx) || Number.isNaN(cy) || Number.isNaN(r) || r <= 0) {
        alert('Проверьте параметры: cx, cy — числа, r > 0');
        return;
    }

    if (cx - r < 0 || cx + r >= GRID_W || cy - r < 0 || cy + r >= GRID_H) {
        console.warn('Окружность выходит за границы логической области');
    }

    const highlightBase = showSymmetry.checked;

    midpointPixels = new Set();
    circleMidpoint(cx, cy, r, { log: true, highlightBase });

    if (showFormula.checked) {
        const formulaPixels = circleFormula(cx, cy, r, '#dc3545');

        let diff = 0;
        for (const p of formulaPixels) {
            if (!midpointPixels.has(p)) diff++;
        }
        for (const p of midpointPixels) {
            if (!formulaPixels.has(p)) diff++;
        }

        console.log('Midpoint точек: ', midpointPixels.size);
        console.log('Formula точек: ', formulaPixels.size);
        console.log('Различий: ', diff);

        const N = 1000;

        const t0 = performance.now();
        for (let i = 0; i < N; i++) {
            circleMidpoint(cx, cy, r);
        }
        const tMid = performance.now() - t0;

        const t1 = performance.now();
        for (let i = 0; i < N; i++) {
            circleFormula(cx, cy, r);
        }
        const tForm = performance.now() - t1;

        console.log(`Midpoint: ${tMid.toFixed(2)} ms`);
        console.log(`Formula: ${tForm.toFixed(2)} ms`);
    }

    renderStepsTable();
}

btnBuild.addEventListener('click', build);

btnClear.addEventListener('click', () => {
    clearCanvas();
    stepsLog = [];
    renderStepsTable();
});

clearCanvas();
build();