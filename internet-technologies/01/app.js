let value = 0;

function render() {
    const valueDisplay = document.getElementById('value-display');
    const statusMessage = document.getElementById('status-message');

    valueDisplay.textContent = value;

    if (value > 0) {
        statusMessage.textContent = "Число положительное";
    } else if (value < 0) {
        statusMessage.textContent = "Число отрицательное";
    } else {
        statusMessage.textContent = "Число равно нулю";
    }
}

document.getElementById('button-increment').addEventListener('click', () => {
    value += 1;
    render();
});

document.getElementById('button-decrement').addEventListener('click', () => {
    value -= 1;
    render();
});

document.getElementById('button-reset').addEventListener('click', () => {
    value = 0;
    render();
});

render();