import { VideoPlayer } from './components/video-player/index.jsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { VideoContext } from './contexts/video.context.js'
import graphicMain2Ograf from '../../../public/ograf/main2/manifest.ograf'
import GraphicTesterWrapper from '../../lib/ograf/views/GraphicTesterWrapper.jsx'

const FPS = 25;

export const Stream = () => {
    const [videoTime, setVideoTime] = useState(0.0);
    const [internalTime, setInternalTime] = useState(0.0);

    const videoPlayer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const [framesMap, setFramesMap] = useState(() => new Map());
    const [_loading, setLoading] = useState(true);
    const [_error, setError] = useState(null);

    const animationFrameRef = useRef(null);
    const lastFrameTimeRef = useRef(performance.now());

    // Цикл анимации
    const startFrameLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        lastFrameTimeRef.current = performance.now();

        const loop = (currentTime) => {
            const delta = currentTime - lastFrameTimeRef.current;
            setInternalTime(prev => prev + (delta / 1000));
            lastFrameTimeRef.current = currentTime;
            animationFrameRef.current = requestAnimationFrame(loop);
        };

        animationFrameRef.current = requestAnimationFrame(loop);
    }, []);

    const stopFrameLoop = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isPlaying) {
            setInternalTime(videoTime);
            startFrameLoop();
        } else {
            stopFrameLoop();
        }

        return () => stopFrameLoop();
    }, [isPlaying, startFrameLoop, stopFrameLoop]);

    useEffect(() => {
        if (!isPlaying) {
            setInternalTime(videoTime);
        }
    }, [videoTime, isPlaying]);

    // Получение текущего фрейма — O(1)
    const currentFrame = useMemo(() => {
        const frameIndex = Math.floor(internalTime * FPS);
        return framesMap.get(frameIndex);
    }, [internalTime, framesMap]);

    // Загрузка и парсинг .jsonl
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

                let tempMap = new Map();

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
                            tempMap.set(parsed.frame_number, parsed);
                        } catch (err) {
                            console.warn('Error parsing line:', line, err);
                        }
                    }
                }

                if (isMounted) {
                    setFramesMap(tempMap);
                    setLoading(false);
                }
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

    const handleTimeUpdate = useCallback((time) => {
        setVideoTime(time);
    }, []);

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
                    <VideoPlayer getCurrentTime={handleTimeUpdate} />
                    <GraphicTesterWrapper
                        graphic={{ manifest: graphicMain2Ograf, folderPath: "/ograf/main2/", path: "/ograf/main2/manifest.ograf" }}
                        currentFrame={currentFrame}
                    />
                </div>
            </VideoContext.Provider>
        </div>
    );
}
