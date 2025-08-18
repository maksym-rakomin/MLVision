import React, {
    useMemo,
    useState,
    useLayoutEffect,
    useRef,
    useEffect,
} from 'react';
import GraphicTester from './GraphicTester.jsx';

// Исходная ширина исходного видео (для расчёта масштаба контейнера)
const SOURCE_VIDEO_WIDTH = 1280;

// Максимум одновременно отображаемых объектов (размер пула компонентов)
const MAX_CONCURRENT_OBJECTS = 18;

// Чем меньше фактор — тем плавнее вертикальное сглаживание
const SMOOTH_FACTOR_Y = 0.04;

const isObjectVisible = (item) => {
    return item && item.bbox && item.bbox.length >= 4;
};

// Ключи пула — стабильные "места" для компонентов GraphicTester
const poolKeys = Array.from({ length: MAX_CONCURRENT_OBJECTS }, (_, i) => i);

function GraphicTesterWrapper({ graphic, currentFrame, prevFrame, nextFrame }) {
    const wrapperRef = useRef(null);

    // scale контейнера относительно исходной ширины видео
    const [containerScale, setContainerScale] = useState(1);

    // Следим за размером контейнера, чтобы передавать корректный scale в потомков
    useLayoutEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const scale = width / SOURCE_VIDEO_WIDTH;
                setContainerScale(scale || 1);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Привязки "track_id -> slot" и обратная "slot -> track_id"
    const trackSlotMap = useRef(new Map());
    const slotTrackMap = useRef(new Map());

    // Карта сглаженных вертикалей: track_id -> { y1, y2 }
    const smoothYMap = useRef(new Map());

    // Достаём видимые объекты из кадра
    const getObjectsFromFrame = (frame) => {
        if (!frame || !frame.tracked_objects) return [];
        return frame.tracked_objects.filter(isObjectVisible);
    };

    const objectsNow = useMemo(() => getObjectsFromFrame(currentFrame), [currentFrame]);
    const objectsNext = useMemo(() => getObjectsFromFrame(nextFrame), [nextFrame]);

    // Ускоряем доступ: карта текущих объектов по track_id
    const currentById = useMemo(() => {
        const m = new Map();
        for (const o of objectsNow) m.set(o.track_id, o);
        return m;
    }, [objectsNow]);

    // Обновляем привязки при смене кадров
    useEffect(() => {
        // Множества активных track_id в текущем и следующем кадре
        const idsNow = new Set(objectsNow.map((o) => o.track_id));
        const idsNext = new Set(objectsNext.map((o) => o.track_id));

        // 1) Удаляем треки, которых нет ни в currentFrame, ни в nextFrame
        for (const id of trackSlotMap.current.keys()) {
            if (!idsNow.has(id) && !idsNext.has(id)) {
                const slot = trackSlotMap.current.get(id);
                trackSlotMap.current.delete(id);
                slotTrackMap.current.delete(slot);
                smoothYMap.current.delete(id);
            }
        }

        // 2) Закрепляем новые треки из текущего кадра за свободными слотами
        for (const obj of objectsNow) {
            const id = obj.track_id;
            if (!trackSlotMap.current.has(id)) {
                // Ищем свободный слот
                let freeSlot = null;
                for (const k of poolKeys) {
                    if (!slotTrackMap.current.has(k)) {
                        freeSlot = k;
                        break;
                    }
                }
                if (freeSlot !== null) {
                    trackSlotMap.current.set(id, freeSlot);
                    slotTrackMap.current.set(freeSlot, id);
                    // Инициализируем сглаживание текущими значениями
                    const y1 = obj.bbox[1];
                    const y2 = obj.bbox[3];
                    smoothYMap.current.set(id, { y1, y2 });
                }
                // Если свободных слотов нет — просто не отображаем "лишний" трек (пул ограничен).
            }
        }
    }, [objectsNow, objectsNext]);

    // Формируем данные для каждого слота пула с учётом сглаживания по вертикали
    const tracksBySlot = useMemo(() => {
        return poolKeys.map((slot) => {
            const trackId = slotTrackMap.current.get(slot);
            if (!trackId) return null; // Слот свободен

            const obj = currentById.get(trackId);
            if (!obj) {
                // Трек зарезервирован слоту, но в этом кадре его нет (возможно, будет в nextFrame)
                // Возвращаем null — GraphicTester сам спрячет контейнер (visibility: hidden),
                // но компонент переиспользуется (слот/ключ не меняется).
                return null;
            }

            const bbox = obj.bbox;
            const prev = smoothYMap.current.get(trackId);

            // Сглаживаем только Y-координаты (bbox[1] и bbox[3])
            let y1 = bbox[1];
            let y2 = bbox[3];

            if (prev) {
                y1 = prev.y1 + (bbox[1] - prev.y1) * SMOOTH_FACTOR_Y;
                y2 = prev.y2 + (bbox[3] - prev.y2) * SMOOTH_FACTOR_Y;
            }
            // Обновляем "память" сглаживания
            smoothYMap.current.set(trackId, { y1, y2 });

            return {
                ...obj,
                bbox: [bbox[0], y1, bbox[2], y2],
            };
        });
    }, [currentById]);

    return (
        <div
            ref={wrapperRef}
            className="graphic-tester-wrapper"
            style={{ position: 'absolute', inset: 0 }}
        >
            {poolKeys.map((index) => (
                <GraphicTester
                    key={index}                 // стабильный ключ пула — гарантирует переиспользование
                    graphic={graphic}
                    track={tracksBySlot[index]} // null => скрыть, но слот остаётся за track_id
                    containerScale={containerScale}
                />
            ))}
        </div>
    );
}

// Мемоизация-обёртка: ререндерим враппер только при смене графики или номера кадра
export default React.memo(GraphicTesterWrapper, (prevProps, nextProps) => {
    return (
        prevProps.graphic === nextProps.graphic &&
        prevProps.currentFrame?.frame_number === nextProps.currentFrame?.frame_number &&
        prevProps.nextFrame?.frame_number === nextProps.nextFrame?.frame_number
        // prevFrame можно добавить аналогично, если используешь его во входах
    );
});
