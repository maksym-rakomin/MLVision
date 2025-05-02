import {VideoPlayer} from './components/video-player/index.jsx'
import {Overlays} from './components/overlays/index.jsx'
import {useCallback, useMemo, useRef, useState} from 'react'
import {VideoContext} from './contexts/video.context.js'
import data from '../../../interval_data.json'


export const Stream = () => {
    const [videoTime, setVideoTime] = useState(0.0)
    const videoPlayer = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false)

    const getCurrentTime = useCallback((time) => {
        setVideoTime(time)

    }, [])

    const getIntervalValue = useMemo(() => {
        const item = data.find(el => videoTime >= el.start && videoTime < el.end);
        return item ? item.value : null;
    }, [videoTime])

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
    };

    return <div >
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
                <VideoPlayer getCurrentTime={getCurrentTime} />
                <Overlays data={getIntervalValue} />
            </div>
        </VideoContext.Provider>
    </div>
}

