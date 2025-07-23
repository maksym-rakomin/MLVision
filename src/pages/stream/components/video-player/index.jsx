import VideoJS from './components/videojs-controller.jsx'
import { memo, useRef} from 'react'

export const VideoPlayer = memo(function VideoPlayer ({getCurrentTime}) {
    const playerRef = useRef(null);

    const videoJsOptions = {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
            src: './public/video/1lap.mp4',
            type: 'video/mp4'
        }]
    };

    const handlePlayerReady = (player) => {
        playerRef.current = player;

        player.on('timeupdate', () => {
            getCurrentTime(player.currentTime())
        });
    };
    return <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />

})
