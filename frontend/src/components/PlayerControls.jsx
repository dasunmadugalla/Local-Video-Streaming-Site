import React, { useEffect, useRef, useState } from 'react';
import {
  FaPlay, FaPause, FaExpand, FaCompress,
  FaVolumeUp, FaVolumeMute, FaUndo,
  FaTachometerAlt,
  FaBackward, FaForward
} from 'react-icons/fa';
import '../styling/VideoPlayer.css';

const PlayerControls = ({
  playing, ended, muted, fullscreen, currentTime, duration, volume,
  videoRef, volumeRef, setPlaying, setMuted, setFullscreen, setVolume, setVolumePercent, setEnded, containerRef, changeVolume,
  playbackRate, setPlaybackRate,
  onPrev, onNext
}) => {
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef(null);

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const handleDocClick = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) setSpeedOpen(false);
    };
    document.addEventListener('pointerdown', handleDocClick);
    return () => document.removeEventListener('pointerdown', handleDocClick);
  }, []);

  // keep volume bar visual in sync with initial prop changes
  useEffect(() => {
    try {
      if (volumeRef?.current) {
        volumeRef.current.value = volume;
        volumeRef.current.style.setProperty('--volume-percent', `${volume * 100}%`);
      }
    } catch { /* ignore */ }
  }, [volume, volumeRef]);

  const togglePlay = () => {
    const v = videoRef?.current;
    if (!v) return;
    if (ended) { v.currentTime = 0; v.play(); setPlaying(true); setEnded(false); }
    else if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    if (!videoRef?.current) return;
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
    try { if (volumeRef.current) volumeRef.current.value = vol; } catch {}
    volumeRef.current?.style?.setProperty('--volume-percent', `${vol * 100}%`);
    if (typeof changeVolume === 'function') changeVolume(vol);
  };

  const formatTime = (time = 0) => {
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);

    const hrsStr = hrs > 0 ? `${hrs.toString().padStart(2, '0')}:` : '';
    const minsStr = mins.toString().padStart(2, '0');
    const secsStr = secs.toString().padStart(2, '0');

    return `${hrsStr}${minsStr}:${secsStr}`;
  };

  const onSpeedSelect = (val) => {
    setPlaybackRate(val);
    try { localStorage.setItem('playbackRate', String(val)); } catch {}
    if (videoRef?.current) videoRef.current.playbackRate = val;
    setSpeedOpen(false);
  };

  return (
    <div className="controls-row">
      <div className="leftControllers">
        <button onClick={onPrev} className="controlBtn" aria-label="Rewind 10s">
          <FaBackward />
        </button>

        <button onClick={togglePlay} className="controlBtn playBtn" aria-label="Play/Pause">
          {ended ? <FaUndo /> : (playing ? <FaPause /> : <FaPlay />)}
        </button>

        <button onClick={onNext} className="controlBtn" aria-label="Forward 10s">
          <FaForward />
        </button>

        <div className="volume-control">
          <button onClick={toggleMute} className="btn volumeBtn" aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}>
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
            aria-label="Volume"
          />
        </div>
      </div>

      <div className="rightControllers">
        <span className="timeDisplay">{formatTime(currentTime)} / {formatTime(duration)}</span>

        <div ref={speedRef} className="speedWrapper">
          <button
            className="btn small"
            aria-haspopup="true"
            aria-expanded={speedOpen}
            onClick={() => { setSpeedOpen(prev => !prev); }}
            title={`Playback speed (${playbackRate}x)`}
          >
            <FaTachometerAlt />
            <span className="speedLabel">{playbackRate}x</span>
          </button>

          {speedOpen && (
  <div role="menu" className="popupMenu">
    {SPEED_OPTIONS.map(sp => {
      const selected = Number(playbackRate) === Number(sp);
      return (
        <button
          key={sp}
          onClick={() => onSpeedSelect(sp)}
          role="menuitem"
          className={`menuItem ${selected ? 'menuItem--selected' : ''}`}
        >
          <span className="menuItem_txt">{sp}x</span>
        </button>
      );
    })}
  </div>
)}

        </div>

        <button onClick={toggleFullscreen} className="screenBtn btn" aria-label="Toggle Fullscreen">
          {fullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
