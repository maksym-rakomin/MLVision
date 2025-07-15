import {VideoPlayer} from './components/video-player/index.jsx'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {VideoContext} from './contexts/video.context.js'
import GraphicTester from '../../lib/ograf/views/GraphicTester.jsx'
import graphicOgraf from '../../../public/ograf/lower/lower.json'
import GraphicTesterWrapper from '../../lib/ograf/views/GraphicTesterWrapper.jsx'



export const Stream = () => {
    // console.log('Stream component loaded', graphicOgraf)
    const [videoTime, setVideoTime] = useState(0.0)
    const videoPlayer = useRef(null)
    const [isPlaying, setIsPlaying] = useState(false)

    const [frames, setFrames] = useState([]);
    const [_loading, setLoading] = useState(true);
    const [_error, setError] = useState(null);

    // Cache for storing frames that have been loaded
    const frameCache = useRef(new Map());

    // Window size for frame loading (how many frames to keep in memory)
    const FRAME_WINDOW_SIZE = 300; // 10 seconds at 30fps

    useEffect(() => {
        // Flag to track if the component is mounted
        let isMounted = true;

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
                    // Check if component is still mounted
                    if (!isMounted) break;

                    const { value, done } = await reader.read();
                    if (done) break;

                    buffer += value;
                    const lines = buffer.split('\n');

                    // Keep the last potentially incomplete line in buffer
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        try {
                            const parsed = JSON.parse(line);

                            // Store in cache for quick access
                            frameCache.current.set(parsed.frame_number, parsed);

                            parsedFrames.push(parsed);
                        } catch (err) {
                            console.warn('Error parsing line:', line, err);
                        }
                    }

                    // Update state in larger batches for better performance
                    if (parsedFrames.length >= 100) {
                        if (isMounted) {
                            setFrames(prev => {
                                // Keep only a window of frames in memory
                                const newFrames = [...prev, ...parsedFrames];
                                if (newFrames.length > FRAME_WINDOW_SIZE) {
                                    return newFrames.slice(-FRAME_WINDOW_SIZE);
                                }
                                return newFrames;
                            });
                        }
                        parsedFrames = [];
                    }
                }

                // Add remaining frames
                if (parsedFrames.length > 0 && isMounted) {
                    setFrames(prev => {
                        const newFrames = [...prev, ...parsedFrames];
                        if (newFrames.length > FRAME_WINDOW_SIZE) {
                            return newFrames.slice(-FRAME_WINDOW_SIZE);
                        }
                        return newFrames;
                    });
                }

                if (isMounted) {
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

        // Cleanup function to prevent memory leaks
        return () => {
            isMounted = false;
        };
    }, []);

    // Optimize getCurrentTime with useCallback to prevent unnecessary re-renders
    const getCurrentTime = useCallback((time) => {
        setVideoTime(time);
    }, []);

    // Optimize handlePlayPause with useCallback
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

    // Use the frameCache directly instead of creating a new Map on each render
    // This is more efficient than rebuilding the map from frames array
    const currentFrame = useMemo(() => {
        const fps = 30;
        const frameIndex = Math.floor(videoTime * fps);

        // First try to get from cache for better performance
        if (frameCache.current.has(frameIndex)) {
            return frameCache.current.get(frameIndex);
        }

        // Fallback to searching in frames array if not in cache
        return frames.find(f => f.frame_number === frameIndex);
    }, [videoTime, frames]);

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
                    <GraphicTesterWrapper
                        graphic={{manifest: graphicOgraf, "folderPath": "/ograf/lower/", "path": "/ograf/lower/lower.json"}}
                        currentFrame={currentFrame}
                    />
                    {/*<Overlays data={getIntervalValue} />*/}
                </div>
            </VideoContext.Provider>
        </div>
    )
}
