import React from 'react';
import { FaPlay, FaPause, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute, FaUndo } from 'react-icons/fa';

const PlayerControls = ({
  playing, ended, muted, fullscreen, currentTime, duration, volume,
  videoRef, volumeRef, setPlaying, setMuted, setFullscreen, setVolume, setVolumePercent, setEnded, containerRef, changeVolume
}) => {

  const togglePlay = () => {
    const v = videoRef.current;
    if (ended) { v.currentTime = 0; v.play(); setPlaying(true); setEnded(false); }
    else if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    videoRef.current.muted = !muted;
    setMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
    setFullscreen(!fullscreen);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setVolumePercent(Math.round(vol * 100));
    volumeRef.current?.style.setProperty('--volume-percent', `${vol * 100}%`);
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60).toString().padStart(2, '0');
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="controls-row">
      <div className="leftControllers">
        <button onClick={togglePlay}>
          {ended ? <FaUndo /> : (playing ? <FaPause /> : <FaPlay />)}
        </button>
        <div className="volume-control">
          <button onClick={toggleMute} className="volumeBtn">
            {muted || volume === 0 ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
          <input
            ref={volumeRef}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volumeBar"
          />
        </div>
      </div>
      <div className="rightControllers">
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        <button onClick={toggleFullscreen} className="screenBtn">
          {fullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
