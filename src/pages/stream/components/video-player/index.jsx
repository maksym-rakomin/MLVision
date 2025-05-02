import videojs from 'video.js'
import VideoJS from './components/videojs-controller.jsx'
import {useRef} from 'react'

export const VideoPlayer = () => {
    const playerRef = useRef(null);

    const videoJsOptions = {
        autoplay: true,
        controls: true,
        responsive: true,
        fluid: true,
        sources: [{
            src: 'src/assets/video/1746175812857099.mp4',
            type: 'video/mp4'
        }]
    };

    const handlePlayerReady = (player) => {
        playerRef.current = player;

        // You can handle player events here, for example:
        player.on('waiting', () => {
            videojs.log('player is waiting');
        });

        player.on('dispose', () => {
            videojs.log('player will dispose');
        });
    };
    return <VideoJS options={videoJsOptions} onReady={handlePlayerReady} />

}
