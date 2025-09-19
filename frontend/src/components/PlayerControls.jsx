import React, { useEffect, useRef, useState } from 'react';
import {
  FaPlay, FaPause, FaExpand, FaCompress,
  FaVolumeUp, FaVolumeMute, FaUndo,
  FaClosedCaptioning, FaTachometerAlt, FaCheck,
  FaBackward, FaForward
} from 'react-icons/fa';

const PlayerControls = ({
  playing, ended, muted, fullscreen, currentTime, duration, volume,
  videoRef, volumeRef, setPlaying, setMuted, setFullscreen, setVolume, setVolumePercent, setEnded, containerRef, changeVolume,
  playbackRate, setPlaybackRate,
  subtitleLabel, subtitleEnabled, onSubtitleUploadClick, toggleSubtitle,
  onPrev, onNext, pipActive, onTogglePip
}) => {
  const [speedOpen, setSpeedOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);
  const speedRef = useRef(null);
  const ccRef = useRef(null);

  const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const handleDocClick = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) setSpeedOpen(false);
      if (ccRef.current && !ccRef.current.contains(e.target)) setCcOpen(false);
    };
    document.addEventListener('pointerdown', handleDocClick);
    return () => document.removeEventListener('pointerdown', handleDocClick);
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) { v.currentTime = 0; v.play(); setPlaying(true); setEnded(false); }
    else if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
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
    try { if (volumeRef.current) volumeRef.current.value = vol; } catch (e) {}
    volumeRef.current?.style?.setProperty('--volume-percent', `${vol * 100}%`);
  };

  const formatTime = (time) => {
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
    try { localStorage.setItem('playbackRate', String(val)); } catch (e) {}
    if (videoRef && videoRef.current) videoRef.current.playbackRate = val;
    setSpeedOpen(false);
  };

  const onCcClick = () => {
    setCcOpen(prev => !prev);
    setSpeedOpen(false);
  };

  const onToggleCc = () => {
    if (typeof toggleSubtitle === 'function') toggleSubtitle();
  };

  const onSelectFile = () => {
    if (typeof onSubtitleUploadClick === 'function') onSubtitleUploadClick();
    setCcOpen(false);
  };

  const truncateLabel = (label, max = 30) => {
    if (!label) return '';
    return label.length > max ? label.slice(0, max - 3) + '...' : label;
  };

  return (
    <div className="controls-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 12px' }}>
      <div className="leftControllers" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onPrev} className="btn controlBtn" aria-label="Rewind 10s" style={{ padding: 8 }}>
          <FaBackward />
        </button>

        <button onClick={togglePlay} className="btn controlBtn" aria-label="Play/Pause" style={{ padding: 0, width: 44, height: 44, borderRadius: 8 }}>
          {ended ? <FaUndo /> : (playing ? <FaPause /> : <FaPlay />)}
        </button>

        <button onClick={onNext} className="btn controlBtn" aria-label="Forward 10s" style={{ padding: 8 }}>
          <FaForward />
        </button>

        <div className="volume-control" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={toggleMute} className="btn volumeBtn" aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'} style={{ padding: 8 }}>
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
            style={{ width: 100 }}
          />
        </div>
      </div>

      {/* Right controls: duration -> speed + cc + pip -> fullscreen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13 }}>{formatTime(currentTime)} / {formatTime(duration)}</span>

        {/* Speed icon + dropdown */}
        <div ref={speedRef} style={{ position: 'relative' }}>
          <button
            className="btn small"
            aria-haspopup="true"
            aria-expanded={speedOpen}
            onClick={() => { setSpeedOpen(prev => !prev); setCcOpen(false); }}
            title={`Playback speed (${playbackRate}x)`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', fontSize: 13 }}
          >
            <FaTachometerAlt />
            <span style={{ fontSize: 12, marginLeft: 6 }}>{playbackRate}x</span>
          </button>

          {speedOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                right: 0,
                background: 'rgba(10,10,10,0.95)',
                color: 'white',
                borderRadius: 6,
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                padding: 6,
                zIndex: 9999,
                minWidth: 88,
                fontSize: 13
              }}
            >
              {SPEED_OPTIONS.map(sp => (
                <button
                  key={sp}
                  onClick={() => onSpeedSelect(sp)}
                  role="menuitem"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                >
                  <span>{sp}x</span>
                  {Number(playbackRate) === Number(sp) ? <FaCheck /> : null}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CC icon + menu */}
        <div ref={ccRef} style={{ position: 'relative' }}>
          <button
            className="btn small ccBtn"
            onClick={onCcClick}
            aria-haspopup="true"
            aria-expanded={ccOpen}
            title="Subtitles — click to open menu"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 8px',
              borderBottom: subtitleEnabled ? '3px solid #e33' : '3px solid transparent',
              transition: 'border-bottom-color 160ms linear',
              fontSize: 13
            }}
          >
            <FaClosedCaptioning />
          </button>

          {ccOpen && (
            <div
              role="menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                right: 0,
                background: 'rgba(10,10,10,0.95)',
                color: 'white',
                borderRadius: 6,
                boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
                padding: 6,
                zIndex: 9999,
                minWidth: 160,
                fontSize: 13
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={onToggleCc}
                  role="menuitem"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                >
                  <span>{subtitleEnabled ? 'Turn captions off' : 'Turn captions on'}</span>
                  {subtitleEnabled ? <FaCheck /> : null}
                </button>

                <button
                  onClick={onSelectFile}
                  role="menuitem"
                  style={{
                    padding: '6px 8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'inherit',
                    cursor: 'pointer',
                    borderRadius: 4,
                    textAlign: 'left',
                    fontSize: 13
                  }}
                >
                  Select subtitle file…
                </button>

                {subtitleLabel && (
                  <div style={{ padding: '6px 8px', fontSize: 12, color: '#ccc', borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 6 }}>
                    Current: {truncateLabel(subtitleLabel, 30)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* PiP button */}
        <button
          onClick={() => { if (typeof onTogglePip === 'function') onTogglePip(); }}
          title="Toggle Picture-in-Picture"
          className="btn small"
          style={{ padding: '6px 8px' }}
        >
          {pipActive ? 'PiP' : 'PiP'}
        </button>

        <button onClick={toggleFullscreen} className="screenBtn btn" aria-label="Toggle Fullscreen" style={{ padding: 8 }}>
          {fullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>
    </div>
  );
};

export default PlayerControls;
