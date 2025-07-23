import React, { useMemo, useState, useLayoutEffect, useRef } from 'react'
import GraphicTester from './GraphicTester.jsx'

// Исходные размеры видео, относительно которых даны координаты bbox
const SOURCE_VIDEO_WIDTH = 1280;

const MAX_CONCURRENT_OBJECTS = 18;

const isObjectVisible = (item) => {
    return item && item.bbox && item.bbox.length >= 4;
};

const poolKeys = Array.from({ length: MAX_CONCURRENT_OBJECTS }, (_, i) => i);

function GraphicTesterWrapper({ graphic, currentFrame }) {
    const wrapperRef = useRef(null);
    // Состояние для хранения реальных размеров контейнера и коэффициента масштабирования
    const [containerMetrics, setContainerMetrics] = useState({ scale: 1 });

    // Эффект для отслеживания изменения размеров контейнера
    useLayoutEffect(() => {
        const observerTarget = wrapperRef.current;
        if (!observerTarget) return;

        // Используем ResizeObserver для эффективного отслеживания изменений
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width } = entry.contentRect;
                // Рассчитываем масштабный коэффициент
                const scale = width / SOURCE_VIDEO_WIDTH;
                setContainerMetrics({ scale });
            }
        });

        resizeObserver.observe(observerTarget);

        // Очистка при размонтировании компонента
        return () => resizeObserver.unobserve(observerTarget);
    }, []); // Запускаем только один раз

    const visibleObjects = useMemo(() => {
        if (!currentFrame || !currentFrame.tracked_objects) {
            return [];
        }
        return currentFrame.tracked_objects.filter(isObjectVisible);
    }, [currentFrame]);

    return (
        // Устанавливаем ref на этот div, чтобы измерить его реальную ширину
        <div ref={wrapperRef} className="graphic-tester-wrapper" style={{ position: "absolute", inset: 0 }}>
            {poolKeys.map((index) => {
                const trackData = visibleObjects[index];

                return (
                    <GraphicTester
                        key={index}
                        graphic={graphic}
                        track={trackData}
                        // Передаем рассчитанный масштаб в каждый дочерний компонент
                        containerScale={containerMetrics.scale}
                    />
                );
            })}
        </div>
    );
}

export default React.memo(GraphicTesterWrapper, (prevProps, nextProps) => {
    return (
        prevProps.graphic === nextProps.graphic &&
        prevProps.currentFrame?.frame_number === nextProps.currentFrame?.frame_number
    );
});
