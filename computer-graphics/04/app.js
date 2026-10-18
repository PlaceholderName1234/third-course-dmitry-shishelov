const GRID_W = 40;
const GRID_H = 30;
const SCALE = 15;

const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');

canvas.width = GRID_W * SCALE;
canvas.height = GRID_H * SCALE;

const INSIDE = 0; // 0000
const LEFT   = 1; // 0001
const RIGHT  = 2; // 0010
const BOTTOM = 4; // 0100
const TOP    = 8; // 1000

function getCode(x, y, rect) {
  let code = INSIDE;

  if (x < rect.xmin) {
    code |= LEFT;
  } else if (x > rect.xmax) {
    code |= RIGHT;
  }

  if (y < rect.ymin) {
    code |= TOP;
  } else if (y > rect.ymax) {
    code |= BOTTOM;
  }

  return code;
}

function codeToString(code) {
    return code.toString(2).padStart(4, '0');
}

function putPixel(x, y, color = '#000000') {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    ctx.fillStyle = color;
    ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
}

function lineDDA(x1, y1, x2, y2, color = '#000000') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
        putPixel(x1, y1, color);
        return;
    }

    const xStep = dx / steps;
    const yStep = dy / steps;

    let x = x1;
    let y = y1;

    for (let i = 0; i <= steps; i += 1) {
        putPixel(Math.round(x), Math.round(y), color);
        x += xStep;
        y += yStep;
    }
}

function drawRect(rect, color = '#000000') {
    lineDDA(rect.xmin, rect.ymin, rect.xmax, rect.ymin, color);
    lineDDA(rect.xmax, rect.ymin, rect.xmax, rect.ymax, color);
    lineDDA(rect.xmax, rect.ymax, rect.xmin, rect.ymax, color);
    lineDDA(rect.xmin, rect.ymax, rect.xmin, rect.ymin, color);
}

function clipLine(x1, y1, x2, y2, rect, log = null) {
    let code1 = getCode(x1, y1, rect);
    let code2 = getCode(x2, y2, rect);

    let step = 0;

    while (true) {
        const push = (action) => {
            if (log) {
                log.push({
                    step,
                    A: `(${x1.toFixed(1)}, ${y1.toFixed(1)})`,
                    codeA: codeToString(code1),
                    B: `(${x2.toFixed(1)}, ${y2.toFixed(1)})`,
                    codeB: codeToString(code2),
                    action
                });
            }
            step += 1;
        };

        if ((code1 | code2) === 0) {
            push('ACCEPT');
            return { x1, y1, x2, y2 };
        }

        if ((code1 & code2) !== 0) {
            push('REJECT');
            return null;
        }

        const codeOut = code1 !== 0 ? code1 : code2;

        let x, y;
        let action;

        if (codeOut & TOP) {
            const t = (rect.ymin - y1) / (y2 - y1);
            x = x1 + t * (x2 - x1);
            y = rect.ymin;
            action = 'пересечение TOP';
        } else if (codeOut & BOTTOM) {
            const t = (rect.ymax - y1) / (y2 - y1);
            x = x1 + t * (x2 - x1);
            y = rect.ymax;
            action = 'пересечение BOTTOM';
        } else if (codeOut & RIGHT) {
            const t = (rect.xmax - x1) / (x2 - x1);
            x = rect.xmax;
            y = y1 + t * (y2 - y1);
            action = 'пересечение RIGHT';
        } else {
            const t = (rect.xmin - x1) / (x2 - x1);
            x = rect.xmin;
            y = y1 + t * (y2 - y1);
            action = 'пересечение LEFT';
        }

        push(action);

        if (codeOut === code1) {
            x1 = x;
            y1 = y;
            code1 = getCode(x1, y1, rect);
        } else {
            x2 = x;
            y2 = y;
            code2 = getCode(x2, y2, rect);
        }
    }
}

const xminInput = document.querySelector('#xmin');
const yminInput = document.querySelector('#ymin');
const xmaxInput = document.querySelector('#xmax');
const ymaxInput = document.querySelector('#ymax');

const x1Input = document.querySelector('#x1');
const y1Input = document.querySelector('#y1');
const x2Input = document.querySelector('#x2');
const y2Input = document.querySelector('#y2');

const buttonBuild = document.querySelector('#button-build');
const buttonPolyline = document.querySelector('#button-polyline');
const buttonRandom = document.querySelector('#button-random');
const buttonClear = document.querySelector('#button-clear');

const codes = document.querySelector('#codes');
const stepsTable = document.querySelector('#steps tbody');
const stats = document.querySelector('#stats');

function readRect() {
    return {
        xmin: parseInt(xminInput.value, 10),
        ymin: parseInt(yminInput.value, 10),
        xmax: parseInt(xmaxInput.value, 10),
        ymax: parseInt(ymaxInput.value, 10)
    };
}

function checkRect(rect) {
    return rect.xmin < rect.xmax && rect.ymin < rect.ymax;
}

function clearCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function clearOutputs() {
    codes.textContent = '';
    stepsTable.innerHTML = '';
    stats.innerHTML = '';
}

function renderSteps(log) {
    stepsTable.innerHTML = '';
    for (const s of log) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.step}</td>
            <td>${s.A}</td>
            <td>${s.codeA}</td>
            <td>${s.B}</td>
            <td>${s.codeB}</td>
            <td>${s.action}</td>
        `;
        stepsTable.appendChild(tr);
    }
}

function buildOneLine() {
    clearCanvas();
    clearOutputs();

    const rect = readRect();
    if (!checkRect(rect)) {
        alert('Проверьте окно: xmin < xmax и ymin < ymax');
        return;
    }

    const x1 = parseFloat(x1Input.value);
    const y1 = parseFloat(y1Input.value);
    const x2 = parseFloat(x2Input.value);
    const y2 = parseFloat(y2Input.value);

    drawRect(rect, '#000000');

    lineDDA(x1, y1, x2, y2, '#bbbbbb');

    const c1 = getCode(x1, y1, rect);
    const c2 = getCode(x2, y2, rect);
    codes.textContent = `A: ${codeToString(c1)}   B: ${codeToString(c2)}`;

    const log = [];
    const clipped = clipLine(x1, y1, x2, y2, rect, log);

    if (clipped) {
        lineDDA(clipped.x1, clipped.y1, clipped.x2, clipped.y2, '#28a745');
    }

    renderSteps(log);
}

function buildPolyLine() {
    clearCanvas();
    clearOutputs();

    const rect = readRect();
    if (!checkRect(rect)) {
        alert('Проверьте окно: xmin < xmax и ymin < ymax');
        return;
    }

    const points = [
        { x: 0,  y: 30  },
        { x: 9, y: 2  },
        { x: 17, y: 27 },
        { x: 17, y: 9  },
        { x: 39, y: 22 }
    ];

    drawRect(rect, '#000000');

    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        lineDDA(a.x, a.y, b.x, b.y, '#bbbbbb');
    }

    const allLog = [];
    let clippedCount = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const log = [];
        const clipped = clipLine(a.x, a.y, b.x, b.y, rect, log);

        for (const step of log) {
            allLog.push({
                ...step,
                A: `S${i} ${step.A}`,
                B: `S${i} ${step.B}`
            });
        }

        if (clipped) {
            lineDDA(clipped.x1, clipped.y1, clipped.x2, clipped.y2, '#28a745');
            clippedCount += 1;
        }
    }

    renderSteps(allLog);
}

function buildRandomLines() {
    clearCanvas();
    clearOutputs();

    const rect = readRect();
    if (!checkRect(rect)) {
        alert('Проверьте окно: xmin < xmax и ymin < ymax');
        return;
    }

    drawRect(rect, '#000000');

    const N = 10;
    let accepted = 0;
    let clipped = 0;
    let rejected = 0;

    for (let i = 0; i < N; i++) {
        const x1 = Math.floor(Math.random() * GRID_W);
        const y1 = Math.floor(Math.random() * GRID_H);
        const x2 = Math.floor(Math.random() * GRID_W);
        const y2 = Math.floor(Math.random() * GRID_H);

        lineDDA(x1, y1, x2, y2, '#dbdbdb');

        const c1 = getCode(x1, y1, rect);
        const c2 = getCode(x2, y2, rect);

        const clippedResult = clipLine(x1, y1, x2, y2, rect);

        if ((c1 | c2) === 0) {
            accepted += 1;
            lineDDA(x1, y1, x2, y2, '#28a745');
        } else if ((c1 & c2) !== 0) {
            rejected += 1;
        } else if (clippedResult) {
            clipped += 1;
            lineDDA(clippedResult.x1, clippedResult.y1,
                    clippedResult.x2, clippedResult.y2, '#28a745');
        } else {
            rejected += 1;
        }
    }

    stats.textContent =
        `Всего: ${N} | принято без изменения: ${accepted} | отсечено: ${clipped} | отброшено: ${rejected}`;
}

buttonBuild.addEventListener('click', buildOneLine);
buttonPolyline.addEventListener('click', buildPolyLine);
buttonRandom.addEventListener('click', buildRandomLines);
buttonClear.addEventListener('click', () => {
    clearCanvas();
    clearOutputs();
});

clearCanvas();
buildOneLine();