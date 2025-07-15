import {VideoPlayer} from './components/video-player/index.jsx'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {VideoContext} from './contexts/video.context.js'
import GraphicTesterInner from '../../lib/ograf/views/GraphicTester.jsx'
import graphicOgraf from '../../../public/ograf/lower/lower.json'



export const Stream = () => {
    // console.log('Stream component loaded', graphicOgraf)
    const [videoTime, setVideoTime] = useState(0.0)
    const videoPlayer = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)

    const [frames, setFrames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const parseStream = async () => {
            try {
                const response = await fetch('/data/log_leader_strict.jsonl');
                if (!response.body) throw new Error('No response body');

                const reader = response.body
                    .pipeThrough(new TextDecoderStream())
                    .getReader();

                let buffer = '';
                let parsedFrames = [];

                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += value;
                    const lines = buffer.split('\n');

                    // Последняя строка может быть неполной — оставим её в буфере
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        try {
                            const parsed = JSON.parse(line);
                            parsedFrames.push(parsed);
                            // Либо можно вызывать setFrames(prev => [...prev, parsed])
                        } catch (err) {
                            console.warn('Ошибка при парсинге строки:', line, err);
                        }
                    }

                    // Пример: обновляем состояние каждые 100 кадров
                    if (parsedFrames.length >= 100) {
                        setFrames(prev => [...prev, ...parsedFrames]);
                        parsedFrames = [];
                    }
                }

                // Добавим оставшиеся кадры
                if (parsedFrames.length > 0) {
                    setFrames(prev => [...prev, ...parsedFrames]);
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(err.message);
                setLoading(false);
            }
        };

        parseStream();
    }, []);

    const getCurrentTime = useCallback((time) => {
        // console.log(time)
        setVideoTime(time)

    }, [])

    // const getIntervalValue = useMemo(() => {
    //     const item = data.find(el => videoTime >= el.start && videoTime < el.end)
    //     return item ? item.value : null
    // }, [videoTime])

    const handlePlayPause = () => {
        if (videoPlayer.current) {

            if (isPlaying) {
                videoPlayer.current.pause()
                setIsPlaying(false)
            } else {
                videoPlayer.current.play()
                setIsPlaying(true)
            }
        }
    }

    const framesMap = useMemo(() => {
        const map = new Map();
        for (const f of frames) {
            map.set(f.frame_number, f);
        }
        return map;
    }, [frames]);

    const currentFrame = useMemo(() => {
        const fps = 30;
        const frameIndex = Math.floor(videoTime * fps);
        return framesMap.get(frameIndex);
    }, [videoTime, framesMap]);

    return (
        <div>
            <h2>Stream</h2>
            <button
                type="button"
                onClick={handlePlayPause}
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    fontSize: '16px'
                }}
            >
                Click to play/pause
            </button>

            <VideoContext.Provider value={videoPlayer}>
                <div className="relative">
                    <VideoPlayer getCurrentTime={getCurrentTime}/>
                    <GraphicTesterInner
                        graphic={{manifest: graphicOgraf, "folderPath": "/ograf/lower/", "path": "/ograf/lower/lower.json"}}
                        currentFrame={currentFrame}
                    />
                    {/*<Overlays data={getIntervalValue} />*/}
                </div>
            </VideoContext.Provider>
        </div>
    )
}

