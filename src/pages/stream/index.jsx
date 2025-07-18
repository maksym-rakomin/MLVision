import { VideoPlayer } from './components/video-player/index.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VideoContext } from './contexts/video.context.js'
import graphicOgraf from '../../../public/ograf/lower/lower.json'
import GraphicTesterWrapper from '../../lib/ograf/views/GraphicTesterWrapper.jsx'

const FPS = 20;

// Window size for frame loading (how many frames to keep in memory)
// Окно в 10 секунд кажется разумным
const FRAME_WINDOW_SIZE = 10 * FPS;

export const Stream = () => {
    // Состояние, получаемое от видеоплеера (обновляется ~3-4 раза/сек)
    const [videoTime, setVideoTime] = useState(0.0);
    // Наше внутреннее, высокочастотное время для плавной анимации (обновляется 20 раз/сек)
    const [internalTime, setInternalTime] = useState(0.0);

    const videoPlayer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const [frames, setFrames] = useState([]);
    const [_loading, setLoading] = useState(true);
    const [_error, setError] = useState(null);

    // Кэш для хранения всех загруженных кадров для быстрого доступа
    const frameCache = useRef(new Map());

    // Ref для хранения ID requestAnimationFrame, чтобы его можно было отменить
    const animationFrameRef = useRef(null);
    // Ref для отслеживания времени последнего обновления кадра в цикле
    const lastFrameTimeRef = useRef(performance.now());

    // --- Логика цикла анимации ---

    // Функция, которая запускает цикл анимации
    const startFrameLoop = useCallback(() => {
        // Останавливаем предыдущий цикл, если он был
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        lastFrameTimeRef.current = performance.now();

        const loop = (currentTime) => {
            const delta = currentTime - lastFrameTimeRef.current;

            // Увеличиваем наше внутреннее время на прошедшее с последнего кадра время
            setInternalTime(prev => prev + (delta / 1000)); // delta в мс, время в секундах

            lastFrameTimeRef.current = currentTime;
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
    }, []);

    // Функция, которая останавливает цикл
    const stopFrameLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

// 1. Эффект для УПРАВЛЕНИЯ циклом анимации (старт/стоп)
    // Зависит ТОЛЬКО от isPlaying.
    useEffect(() => {
        if (isPlaying) {
            // При старте синхронизируем время и запускаем цикл
            setInternalTime(videoTime);
            startFrameLoop();
        } else {
            stopFrameLoop();
        }

        // Очистка при размонтировании компонента
        return () => {
            stopFrameLoop();
        };
    }, [isPlaying, startFrameLoop, stopFrameLoop]); // <-- Убрали videoTime из зависимостей!

    // 2. Эффект для СИНХРОНИЗАЦИИ времени
    // Зависит от videoTime. Выполняет "жесткую" синхронизацию.
    // Это исправляет расхождение времени и обеспечивает корректную перемотку.
    useEffect(() => {
        // Если видео не играет (например, при перемотке),
        // мы немедленно обновляем наше внутреннее время.
        if (!isPlaying) {
            setInternalTime(videoTime);
        }
        // Периодическая синхронизация во время проигрывания для предотвращения
        // большого расхождения теперь не так критична, т.к. цикл сам считает время.
        // Но ручная перемотка в состоянии паузы обрабатывается здесь идеально.

    }, [videoTime, isPlaying]); // Зависит от videoTime и isPlaying


    // --- Логика загрузки и обработки данных ---

    const currentFrame = useMemo(() => {
        // Теперь мы используем наше плавное internalTime
        const frameIndex = Math.floor(internalTime * FPS);

        // Сначала ищем в кэше - это самый быстрый способ
        if (frameCache.current.has(frameIndex)) {
            return frameCache.current.get(frameIndex);
        }

        // Если в кэше нет, ищем в текущем окне кадров (менее предпочтительно)
        return frames.find(f => f.frame_number === frameIndex);
    }, [internalTime, frames]); // Зависимость только от internalTime и frames


    // Эффект для загрузки и парсинга данных из .jsonl файла (без изменений)
    useEffect(() => {
        let isMounted = true;

        const parseStream = async () => {
            try {
                const response = await fetch('/data/log_leader_strict_trimmed.jsonl');
                if (!response.body) throw new Error('No response body');

                const reader = response.body
                    .pipeThrough(new TextDecoderStream())
                    .getReader();

                let buffer = '';
                let parsedFramesBatch = [];

                while (true) {
                    if (!isMounted) break;
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        try {
                            const parsed = JSON.parse(line);
                            frameCache.current.set(parsed.frame_number, parsed);
                            parsedFramesBatch.push(parsed);
                        } catch (err) {
                            console.warn('Error parsing line:', line, err);
                        }
                    }

                    if (parsedFramesBatch.length >= 100) {
                        if (isMounted) {
                            setFrames(prev => {
                                const newFrames = [...prev, ...parsedFramesBatch];
                                return newFrames.length > FRAME_WINDOW_SIZE
                                    ? newFrames.slice(-FRAME_WINDOW_SIZE)
                                    : newFrames;
                            });
                        }
                        parsedFramesBatch = [];
                    }
                }

                if (parsedFramesBatch.length > 0 && isMounted) {
                    setFrames(prev => {
                        const newFrames = [...prev, ...parsedFramesBatch];
                        return newFrames.length > FRAME_WINDOW_SIZE
                            ? newFrames.slice(-FRAME_WINDOW_SIZE)
                            : newFrames;
                    });
                }

                if (isMounted) setLoading(false);
            } catch (err) {
                console.error(err);
                if (isMounted) {
                    setError(err.message);
                    setLoading(false);
                }
            }
        };

        parseStream();

        return () => {
            isMounted = false;
        };
    }, []);

    // --- Обработчики событий от плеера ---

    // Обработчик времени из плеера (упрощен)
    const handleTimeUpdate = useCallback((time) => {
        setVideoTime(time);
    }, []); // Больше не нужна зависимость от isPlaying

    // Обработчик play/pause
    const handlePlayPause = useCallback(() => {
        if (videoPlayer.current) {
            if (isPlaying) {
                videoPlayer.current.pause();
                setIsPlaying(false);
            } else {
                videoPlayer.current.play();
                setIsPlaying(true);
            }
        }
    }, [isPlaying]);

    return (
        <div>
            <h2>Stream</h2>
            <button
                type="button"
                onClick={handlePlayPause}
                style={{ marginTop: '20px', padding: '10px 20px', fontSize: '16px' }}
            >
                {isPlaying ? 'Pause' : 'Play'}
            </button>

            <VideoContext.Provider value={videoPlayer}>
                <div className="relative">
                    {/* Передаем новый обработчик в плеер */}
                    <VideoPlayer getCurrentTime={handleTimeUpdate}/>
                    <GraphicTesterWrapper
                        graphic={{ manifest: graphicOgraf, "folderPath": "/ograf/lower/", "path": "/ograf/lower/lower.json" }}
                        currentFrame={currentFrame}
                    />
                </div>
            </VideoContext.Provider>
        </div>
    )
}
