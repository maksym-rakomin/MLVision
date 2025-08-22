// sort-tracked-objects.js
import fs from "fs";
import readline from "readline";

const inputFile = "./public/data/3laps.jsonl";
const outputFile = "./public/data/prepareData.jsonl";
const DURATION_SCREEN = 15

async function processFile() {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        crlfDelay: Infinity,
    });

    const frames = [];

    // читаем все строки
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            frames.push(JSON.parse(line));
        } catch (err) {
            console.error("Ошибка парсинга строки:", line, err);
        }
    }

    // считаем первый и последний кадр для каждого track_id
    const trackLife = new Map();

    for (const frame of frames) {
        for (const obj of frame.tracked_objects ?? []) {
            const id = obj.track_id;
            if (!trackLife.has(id)) {
                trackLife.set(id, { first: frame.frame_number, last: frame.frame_number });
            } else {
                trackLife.get(id).last = frame.frame_number;
            }
        }
    }

    // вычисляем длительность жизни каждого track_id
    const shortLived = new Set(
        [...trackLife.entries()]
            .filter(([_, { first, last }]) => last - first < DURATION_SCREEN) // < 500 ms
            .map(([id]) => id)
    );

    // фильтруем и сортируем tracked_objects
    for (const frame of frames) {
        if (Array.isArray(frame.tracked_objects)) {
            frame.tracked_objects = frame.tracked_objects
                .filter((obj) => !shortLived.has(obj.track_id))
                .sort((a, b) => a.track_id - b.track_id);
        }
    }

    // сохраняем результат
    const output = fs.createWriteStream(outputFile);
    for (const frame of frames) {
        output.write(JSON.stringify(frame) + "\n");
    }
    output.end();

    console.log(
        `Файл обработан → ${outputFile}\nУдалены треки (меньше 500мс):`,
        [...shortLived]
    );
}

processFile();
