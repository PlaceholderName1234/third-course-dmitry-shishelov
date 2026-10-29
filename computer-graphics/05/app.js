const GRID_W = 40;
const GRID_H = 30;
const SCALE  = 15;

const EMPTY = 0;
const BORDER = 1;
const FILLED = 2;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
canvas.width  = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

let floodStats = { filled: 0, processed: 0 };
let scanStats  = { filled: 0, processed: 0 };

let grid = [];

function initGrid() {
    grid = [];
    for (let y = 0; y < GRID_H; y++) {
        const row = [];
        for (let x = 0; x < GRID_W; x++) row.push(EMPTY);
        grid.push(row);
    }
}

function lineBresenham(x1, y1, x2, y2) {
    let x = x1;
    let y = y1;

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);

    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;

    let error = dx - dy;

    while (true) {
        putPixel(x, y);

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

function putPixel(x, y) {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    grid[y][x] = BORDER;
}

function renderCanvas(floodSteps = null) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            const state = grid[y][x];
            if (state === EMPTY) continue;

            if (state === BORDER) ctx.fillStyle = '#000000';
            else if (state === FILLED) ctx.fillStyle = '#249e40';

            if (state === FILLED && floodSteps !== null) {
                const stepNum = floodStepMap.get(`${x},${y}`);
                if (stepNum !== undefined && stepNum > floodSteps) continue;
            }

            ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        }
    }
}

// const polygon = [
//     { x: 5,  y: 15  },
//     { x: 20, y: 5  },
//     { x: 35, y: 15 },
//     { x: 30, y: 25 },
//     { x: 10,  y: 25 }
// ];

const polygon = [
    { x: 5,  y: 15  },
    { x: 20, y: 5  },
    { x: 35, y: 15 },
    { x: 30, y: 25 },
    { x: 20,  y: 15 },
    { x: 10,  y: 25 }
];

function drawPolygon() {
    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        lineBresenham(a.x, a.y, b.x, b.y);
    }
    renderCanvas();
}

let floodStepMap = new Map();
let floodMaxSteps = 0;

function floodFill(startX, startY) {
    if (grid[startY][startX] !== EMPTY) return;

    floodStepMap = new Map();
    const queue = [{ x: startX, y: startY }];
    let step = 0;

    floodStats = { filled: 0, processed: 0 };

    const dirs = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
    ];

    while (queue.length > 0) {
        const { x, y } = queue.shift();

        floodStats.processed++;

        if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) continue;
        if (grid[y][x] !== EMPTY) continue;

        grid[y][x] = FILLED;
        floodStats.filled++;
        floodStepMap.set(`${x},${y}`, step++);

        for (const { dx, dy } of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && grid[ny][nx] === EMPTY) {
                queue.push({ x: nx, y: ny });
            }
        }
    }
    
    floodMaxSteps = step;
    const slider = document.querySelector('#flood-step');
    slider.max = floodMaxSteps;
    slider.value = floodMaxSteps;
    slider.disabled = false;
    document.querySelector('#flood-step-label').textContent = floodMaxSteps;
}

function getIntersections(points, y) {
    const xs = [];

    for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        const b = points[(i + 1) % points.length];

        if (a.y === b.y) {
            continue;
        }

        const yMin = Math.min(a.y, b.y);
        const yMax = Math.max(a.y, b.y);

        if (y < yMin || y >= yMax) {
            continue;
        }

        const x = a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y);
        xs.push(x);
    }

    xs.sort((a, b) => a - b);
    return xs;
}

function scanlineFill(points) {
    scanStats = { filled: 0, processed: 0 };

    let minY = Math.min(...points.map(p => p.y));
    let maxY = Math.max(...points.map(p => p.y));

    for (let y = minY; y <= maxY; y++) {
        scanStats.processed++;

        const xs = getIntersections(points, y);
        
        for (let i = 0; i < xs.length; i += 2) {
            const xStart = Math.ceil(xs[i]);
            const xEnd = Math.floor(xs[i + 1]);

            for (let x = xStart; x <= xEnd; x++) {
                if (grid[y] && grid[y][x] !== BORDER) {
                    grid[y][x] = FILLED;
                    scanStats.filled++;
                }
            }
        }
    }
    renderCanvas();
}

function renderScanInfo(y) {
    const xs = getIntersections(polygon, y);
    const intervals = [];
    for (let i = 0; i < xs.length; i += 2) {
        if (xs[i + 1] !== undefined) {
            intervals.push(`${Math.ceil(xs[i])} ... ${Math.floor(xs[i + 1])}`);
        }
    }
    const info = 
    `y = ${y}
x: ${xs.map(x => x.toFixed(2)).join(', ') || 'нет'}
fill: ${intervals.join(', ') || 'нет'}`;
    document.querySelector('#scan-info').textContent = info;
}



document.querySelector('#button-clear').addEventListener('click', () => {
    initGrid();
    drawPolygon();
    
    document.querySelector('#flood-step').disabled = true;
    document.querySelector('#flood-step-label').textContent = '';
    document.querySelector('#scan-info').textContent = 'Нажмите «Scanline Fill»';
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / SCALE);
    const y = Math.floor((e.clientY - rect.top)  / SCALE);
    
    floodFill(x, y);
    renderCanvas();
});

const stepSlider = document.querySelector('#flood-step');
stepSlider.addEventListener('input', (e) => {
    const step = Number(e.target.value);
    document.querySelector('#flood-step-label').textContent = step;
    renderCanvas(step);
});

document.querySelector('#button-scanline').addEventListener('click', () => {
    const y = Number(document.querySelector('#scan-y').value);
    renderScanInfo(y);
    scanlineFill(polygon);
});

initGrid();
drawPolygon();

document.querySelector('#button-compare').addEventListener('click', () => {
    const startX = 20;
    const startY = 12;

    const N = 1000;

    initGrid();
    drawPolygon();
    floodFill(startX, startY);
    const floodFilled    = floodStats.filled;
    const floodProcessed = floodStats.processed;


    initGrid();
    drawPolygon();
    scanlineFill(polygon);
    const scanFilled    = scanStats.filled;
    const scanProcessed = scanStats.processed;

    let floodSum = 0;
    for (let i = 0; i < N; i++) {
        initGrid();
        drawPolygon();
        const t0 = performance.now();
        floodFill(startX, startY);
        floodSum += performance.now() - t0;
    }

    let scanSum = 0;
    for (let i = 0; i < N; i++) {
        initGrid();
        drawPolygon();
        const t0 = performance.now();
        scanlineFill(polygon);
        scanSum += performance.now() - t0;
    }

    const info = `Flood Fill:   закрашено ${floodFilled}, обработано ${floodProcessed}, среднее время ${(floodSum / N).toFixed(3)} ms
Scanline:     закрашено ${scanFilled}, обработано ${scanProcessed}, среднее время ${(scanSum / N).toFixed(3)} ms`;
    document.querySelector('#compare-info').textContent = info;
});