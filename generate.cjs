const fs = require('fs');

const screenWidth = 1100;
const screenHeight = 600;
const totalSeconds = 70;
const objectCount = 3;
const speedMultiplier = 3;

const data = [];
const posMap = {};
const skipRanges = generateSkipRanges(3); // генерируем 3 пропуска

// Настройки объектов
const trackedObjects = [
    { id: 'obj1', name: 'John', moveType: 'zigzag' },
    { id: 'obj2', name: 'Alice', moveType: 'diagonal' },
    { id: 'obj3', name: 'Bob', moveType: 'random' },
];

// Инициализация
trackedObjects.forEach(obj => {
    posMap[obj.id] = {
        posX: Math.floor(Math.random() * screenWidth),
        posY: Math.floor(Math.random() * screenHeight),
        dx: getRandom(-4, 4) * speedMultiplier,
        dy: getRandom(-4, 4) * speedMultiplier,
        tick: 0
    };
});

function getRandom(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function moveObject(obj) {
    const state = posMap[obj.id];

    if (obj.moveType === 'zigzag') {
        state.tick++;
        if (state.tick % 10 === 0) {
            state.dx *= -1;
            state.dy = getRandom(-2, 2) * speedMultiplier;
        }
    } else if (obj.moveType === 'diagonal') {
        if (state.tick === 0) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            state.dx = 3 * dir * speedMultiplier;
            state.dy = 3 * dir * speedMultiplier;
        }
    } else if (obj.moveType === 'random') {
        state.dx = getRandom(-4, 4) * speedMultiplier;
        state.dy = getRandom(-4, 4) * speedMultiplier;
    }

    // отскок от краёв
    if (state.posX + state.dx > screenWidth || state.posX + state.dx < 0) {
        state.dx *= -1;
    }
    if (state.posY + state.dy > screenHeight || state.posY + state.dy < 0) {
        state.dy *= -1;
    }

    // обновление позиции
    state.posX += state.dx;
    state.posY += state.dy;
    state.tick++;

    return {
        id: obj.id,
        name: obj.name,
        posX: state.posX,
        posY: state.posY
    };
}

function isInSkipRange(time) {
    return skipRanges.some(([start, end]) => time >= start && time < end);
}

function generateSkipRanges(count) {
    const ranges = [];
    for (let i = 0; i < count; i++) {
        const start = Math.random() * (totalSeconds - 3); // избегаем конца
        const duration = getRandom(1, 3); // 1–3 секунды
        ranges.push([parseFloat(start.toFixed(2)), parseFloat((start + duration).toFixed(2))]);
    }
    return ranges;
}

let currentTime = 0;

while (currentTime < totalSeconds) {
    const intervalsPerSecond = 5 + Math.floor(Math.random() * 3);
    const secondStep = 1.0 / intervalsPerSecond;

    for (let i = 0; i < intervalsPerSecond; i++) {
        const start = parseFloat((currentTime + i * secondStep).toFixed(6));
        const end = parseFloat((currentTime + (i + 1) * secondStep).toFixed(6));

        if (isInSkipRange(start)) {
            // пропускаем этот интервал
            continue;
        }

        const value = trackedObjects.map(obj => moveObject(obj));
        data.push({ start, end, value });
    }

    currentTime += 1;
}

// Сохраняем результат
fs.writeFileSync('interval_data.json', JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Файл interval_data.json сохранён');
console.log('ℹ️  Пропуски данных (сек.):', skipRanges);
