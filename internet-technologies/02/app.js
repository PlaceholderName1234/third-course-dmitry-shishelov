const values = [];

function addValue(value) {
    values.push(value);
}

function removeLastValue() {
    values.pop();
}

function clearValues() {
    values.length = 0;
}

function getStatistics(values) {
    if (values.length === 0) {
        return {
            count: 0,
            sum: 0,
            min: null,
            max: null,
            average: null
        };
    }

    let sum = 0;
    let min = values[0];
    let max = values[0];

    for (const v of values) {
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
    }

    return {
        count: values.length,
        sum: sum,
        min: min,
        max: max,
        average: sum / values.length
    };
}

function render() {
    const list = document.querySelector('#numbers-list');
    list.innerHTML = '';
    for (const v of values) {
        const li = document.createElement('li');
        li.textContent = v;
        list.appendChild(li);
    }

    const stats = getStatistics(values);

    document.querySelector('#stat-count').textContent = stats.count;
    document.querySelector('#stat-sum').textContent = stats.sum;

    document.querySelector('#stat-average').textContent =
        stats.average === null ? '-' : stats.average.toFixed(2);
    document.querySelector('#stat-min').textContent =
        stats.min === null ? '-' : stats.min;
    document.querySelector('#stat-max').textContent =
        stats.max === null ? '-' : stats.max;
}

const input = document.querySelector('#number-input');

document.querySelector('#button-add').addEventListener('click', () => {
    const raw = input.value;
    if (raw === '') {
        alert('Введите число');
        return;
    }

    const num = Number(input.value);
    if (Number.isNaN(num)) return;

    addValue(num);
    input.value = '';
    input.focus();
    render();
});

document.querySelector('#button-remove').addEventListener('click', () => {
    removeLastValue();
    render();
});

document.querySelector('#button-clear').addEventListener('click', () => {
    clearValues();
    render();
});

render();