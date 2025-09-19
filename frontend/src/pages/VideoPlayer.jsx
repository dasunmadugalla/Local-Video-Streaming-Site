import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPreview from '../components/VideoPreview';
import PlayerControls from '../components/PlayerControls';
import ProgressBar from '../components/ProgressBar';
import NextPreviews from '../components/NextPreviews';
import '../styling/VideoPlayer.css';
import { API_BASE } from '../utils/api';

// tweak these if you want different behavior
const DOUBLE_TAP_DELAY_MS = 300; // ms between taps to count as double tap
const DOUBLE_TAP_SKIP_SECONDS = 10; // seconds per double-tap
const SKIP_INDICATOR_DURATION = 800; // ms to show skip overlay
const VERTICAL_DRAG_THRESHOLD = 10; // px to start vertical volume drag
const CONTROLS_HIDE_MS = 5000; // auto-hide controls after 5s of inactivity

const VideoPlayer = () => {
  const { fileName: rawFileName } = useParams();
  const navigate = useNavigate();

  const decodedName = rawFileName ? decodeURIComponent(rawFileName) : '';
  const videoSrc = `${API_BASE}/videos/${encodeURIComponent(decodedName)}`;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const hoverPreviewRef = useRef(null);
  const previewTimeRef = useRef(null);

  // tap helpers
  const lastTapTimeRef = useRef(0);
  const lastTapXRef = useRef(0);
  const singleTapTimeoutRef = useRef(null);

  // skip accumulator
  const skipAccumulatorRef = useRef({ amount: 0, dir: null });
  const skipClearTimeoutRef = useRef(null);

  // vertical drag helpers
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const isVerticalDraggingRef = useRef(false);
  const startVolumeRef = useRef(1);

  // subtitle file input ref
  const subtitleInputRef = useRef(null);

  // controls hide timer ref
  const hideControlsTimeoutRef = useRef(null);

  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('globalVolume');
    return saved ? parseFloat(saved) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [volumeDisplay, setVolumeDisplay] = useState(false);
  const [volumePercent, setVolumePercent] = useState(() => {
    const saved = localStorage.getItem('globalVolume');
    return saved ? Math.round(parseFloat(saved) * 100) : 100;
  });
  const [randomNext, setRandomNext] = useState([]);

  // controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);

  // playback speed
  const [playbackRate, setPlaybackRate] = useState(1);

  // subtitles state
  const [subtitleTrack, setSubtitleTrack] = useState(null); // { src, label, isLocalBlob }
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleLabel, setSubtitleLabel] = useState('');

  // UI skip indicator
  const [skipIndicator, setSkipIndicator] = useState({ visible: false, text: '' });

  // buffering indicator
  const [buffering, setBuffering] = useState(false);

  // Debug log (optional)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('VideoPlayer param raw:', rawFileName, 'decoded:', decodedName, 'videoSrc:', videoSrc);
  }, [rawFileName]);

  // ---- Controls visibility helpers ----
  const clearHideTimer = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
      hideControlsTimeoutRef.current = null;
    }
  };

  const hideControls = () => {
    // don't hide while paused, buffering, showing volume, skip indicator visible, or ended
    if (!playing || buffering || volumeDisplay || skipIndicator.visible || ended) {
      // re-schedule a check later
      scheduleHideControls();
      return;
    }
    setControlsVisible(false);
  };

  const scheduleHideControls = (delay = CONTROLS_HIDE_MS) => {
    clearHideTimer();
    hideControlsTimeoutRef.current = setTimeout(() => {
      hideControls();
    }, delay);
  };

  const showControls = (opts = {}) => {
    // opts.force will show and optionally keep visible if forceKeep
    setControlsVisible(true);
    clearHideTimer();
    if (opts.forceKeep) return;
    scheduleHideControls();
  };

  // ---- verify resource exists ----
  useEffect(() => {
    fetch(videoSrc, { method: 'HEAD' })
      .then(res => { if (!res.ok) navigate('/'); })
      .catch(() => navigate('/'));
  }, [videoSrc, navigate]);

  // ---- fetch random Next previews ----
  useEffect(() => {
    fetch(`${API_BASE}/random?limit=9`)
      .then(res => res.json())
      .then(data => setRandomNext(data.filter(f => f !== decodedName)))
      .catch(() => setRandomNext([]));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [decodedName]);

  // apply playbackRate to video element
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // initialize volume on video element and persist
  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume;
      if (volumeRef.current) volumeRef.current.style.setProperty('--volume-percent', `${volume * 100}%`);
      try { localStorage.setItem('globalVolume', volume); } catch (e) {}
    }
  }, [volume]);

  // wheel handling + ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWheel = (e) => {
      const rect = video.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        e.preventDefault();
        Math.abs(e.deltaY) >= Math.abs(e.deltaX)
          ? changeVolume(e.deltaY < 0 ? 0.01 : -0.01)
          : video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + e.deltaX * 0.05));
      }
    };

    const handleEnded = () => {
      setPlaying(false);
      setEnded(true);
      showControls({ forceKeep: true });
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    video.addEventListener('ended', handleEnded);
    // try auto-play (if allowed) and reflect state if it fails
    video.play().catch(() => setPlaying(false));

    return () => {
      window.removeEventListener('wheel', handleWheel);
      video.removeEventListener('ended', handleEnded);
    };
  }, []); // intentionally run once

  // keyboard shortcuts (also reveal controls on key activity)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleKeyDown = (e) => {
      showControls();
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.05);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.05);
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [muted, fullscreen, ended]); // rebind when these change

  const changeVolume = (delta) => {
    setVolume(prev => {
      const newVol = Math.min(1, Math.max(0, prev + delta));
      setVolumePercent(Math.round(newVol * 100));
      setVolumeDisplay(true);
      clearTimeout(window.hideTimeout);
      window.hideTimeout = setTimeout(() => setVolumeDisplay(false), 1000);
      // show controls while adjusting volume
      showControls({ forceKeep: true });
      return newVol;
    });
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) {
      v.currentTime = 0;
      v.play();
      setPlaying(true);
      setEnded(false);
      showControls();
    } else if (v.paused) {
      v.play();
      setPlaying(true);
      showControls();
    } else {
      v.pause();
      setPlaying(false);
      showControls({ forceKeep: true });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(videoRef.current.muted);
    showControls();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
    setFullscreen(!fullscreen);
    showControls();
  };

  // -- Skip indicator helpers --
  const showSkipIndicator = (text) => {
    setSkipIndicator({ visible: true, text });
    showControls({ forceKeep: true });
    if (skipClearTimeoutRef.current) clearTimeout(skipClearTimeoutRef.current);
    skipClearTimeoutRef.current = setTimeout(() => {
      skipAccumulatorRef.current = { amount: 0, dir: null };
      setSkipIndicator({ visible: false, text: '' });
      scheduleHideControls();
    }, SKIP_INDICATOR_DURATION);
  };

  const handleSkip = (direction) => {
    const video = videoRef.current;
    if (!video) return;
    const delta = DOUBLE_TAP_SKIP_SECONDS * (direction === 'right' ? 1 : -1);
    const newTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || Infinity);
    video.currentTime = newTime;

    if (skipAccumulatorRef.current.dir === direction) {
      skipAccumulatorRef.current.amount += Math.abs(delta);
    } else {
      skipAccumulatorRef.current.dir = direction;
      skipAccumulatorRef.current.amount = Math.abs(delta);
    }

    const sign = direction === 'right' ? '+' : '-';
    showSkipIndicator(`${sign}${skipAccumulatorRef.current.amount}s`);
  };

  // ----------------------
  // Subtitles: auto-load or upload
  // ----------------------

  const srtToVtt = (srtText) => {
    const vttLines = ['WEBVTT\n\n'];
    const lines = srtText.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      if (line.includes('-->')) {
        line = line.replace(/,/g, '.');
      }
      vttLines.push(line + '\n');
    }
    return vttLines.join('');
  };

  useEffect(() => {
    let aborted = false;
    let localBlobUrl = null;

    const tryFetch = async () => {
      if (!decodedName) return;
      const base = decodedName.replace(/\.[^/.]+$/, '');
      const candidates = [
        `${API_BASE}/videos/${encodeURIComponent(base)}.vtt`,
        `${API_BASE}/videos/${encodeURIComponent(base)}.srt`
      ];

      for (const url of candidates) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) continue;
          const text = await resp.text();
          if (aborted) return;
          if (url.endsWith('.vtt')) {
            setSubtitleTrack({ src: url, label: `${base}.vtt`, isLocalBlob: false });
            setSubtitleLabel(`${base}.vtt`);
            setSubtitleEnabled(true);
            return;
          } else if (url.endsWith('.srt')) {
            const vtt = srtToVtt(text);
            const blob = new Blob([vtt], { type: 'text/vtt' });
            localBlobUrl = URL.createObjectURL(blob);
            setSubtitleTrack({ src: localBlobUrl, label: `${base}.srt`, isLocalBlob: true });
            setSubtitleLabel(`${base}.srt`);
            setSubtitleEnabled(true);
            return;
          }
        } catch (e) {
          // ignore and try next
        }
      }
      setSubtitleTrack(null);
      setSubtitleLabel('');
      setSubtitleEnabled(false);
    };

    tryFetch();

    return () => {
      aborted = true;
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [decodedName]);

  // Handle file upload for subtitles
  const onSubtitleUploadClick = () => {
    if (subtitleInputRef.current) subtitleInputRef.current.click();
  };

  const handleSubtitleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    let vttText = text;
    if (file.name.toLowerCase().endsWith('.srt')) {
      vttText = srtToVtt(text);
    } else if (!file.name.toLowerCase().endsWith('.vtt')) {
      vttText = text;
    }
    const blob = new Blob([vttText], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);

    if (subtitleTrack && subtitleTrack.isLocalBlob && subtitleTrack.src) {
      try { URL.revokeObjectURL(subtitleTrack.src); } catch (e) {}
    }

    setSubtitleTrack({ src: url, label: file.name, isLocalBlob: true });
    setSubtitleLabel(file.name);
    setSubtitleEnabled(true);
  };

  const onSubtitleFileInput = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) handleSubtitleFile(f);
    e.target.value = '';
  };

  const toggleSubtitle = () => {
    const vid = videoRef.current;
    if (!vid) return;
    const tracks = vid.textTracks || [];
    if (!subtitleTrack) {
      setSubtitleEnabled(false);
      return;
    }
    for (let i = 0; i < tracks.length; i++) tracks[i].mode = 'hidden';
    setTimeout(() => {
      const tks = vid.textTracks || [];
      let found = null;
      for (let i = 0; i < tks.length; i++) {
        if (tks[i].label === subtitleLabel || tks[i].language === subtitleLabel) {
          found = tks[i];
          break;
        }
      }
      if (!found && tks.length > 0) found = tks[0];
      if (found) {
        if (subtitleEnabled) {
          found.mode = 'hidden';
          setSubtitleEnabled(false);
        } else {
          found.mode = 'showing';
          setSubtitleEnabled(true);
        }
      } else {
        setSubtitleEnabled(prev => !prev);
      }
    }, 100);
  };

  // ---- Buffering & play/pause syncing (includes the play/pause fix) ----
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const onWaiting = () => { setBuffering(true); showControls({ forceKeep: true }); };
    const onStalled = () => { setBuffering(true); showControls({ forceKeep: true }); };
    const onLoadStart = () => { setBuffering(true); showControls({ forceKeep: true }); };

    const stopBufferingAndMaybeHide = () => {
      setBuffering(false);
      scheduleHideControls();
    };

    const onCanPlay = stopBufferingAndMaybeHide;
    const onPlaying = () => { stopBufferingAndMaybeHide(); setPlaying(true); setEnded(false); };
    const onCanPlayThrough = stopBufferingAndMaybeHide;
    const onLoadedData = stopBufferingAndMaybeHide;
    const onSeeked = stopBufferingAndMaybeHide;
    const onError = () => { stopBufferingAndMaybeHide(); };

    // NEW: sync play/pause events so UI reflects actual element state
    const onPlay = () => {
      setPlaying(true);
      setEnded(false);
      scheduleHideControls();
    };
    const onPause = () => {
      setPlaying(false);
      showControls({ forceKeep: true });
    };

    vid.addEventListener('waiting', onWaiting);
    vid.addEventListener('stalled', onStalled);
    vid.addEventListener('loadstart', onLoadStart);
    vid.addEventListener('canplay', onCanPlay);
    vid.addEventListener('playing', onPlaying);
    vid.addEventListener('canplaythrough', onCanPlayThrough);
    vid.addEventListener('loadeddata', onLoadedData);
    vid.addEventListener('seeked', onSeeked);
    vid.addEventListener('error', onError);

    vid.addEventListener('play', onPlay);
    vid.addEventListener('pause', onPause);

    // If not ready yet, show spinner until ready
    if (vid.readyState < 3) setBuffering(true);

    // Also set initial playing state to reflect the element (useful when changing src)
    setPlaying(!vid.paused && !vid.ended);

    return () => {
      vid.removeEventListener('waiting', onWaiting);
      vid.removeEventListener('stalled', onStalled);
      vid.removeEventListener('loadstart', onLoadStart);
      vid.removeEventListener('canplay', onCanPlay);
      vid.removeEventListener('playing', onPlaying);
      vid.removeEventListener('canplaythrough', onCanPlayThrough);
      vid.removeEventListener('loadeddata', onLoadedData);
      vid.removeEventListener('seeked', onSeeked);
      vid.removeEventListener('error', onError);

      vid.removeEventListener('play', onPlay);
      vid.removeEventListener('pause', onPause);
    };
  }, [videoSrc]); // re-run when source changes

  // setup mouse/touch listeners for showing/hiding controls (NEW)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMouseMove = () => {
      showControls();
    };
    const onMouseLeave = () => {
      // preserve old behavior: hide immediately when cursor leaves the player
      setControlsVisible(false);
      clearHideTimer();
    };
    const onTouchStart = () => {
      showControls();
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('touchstart', onTouchStart);

    // schedule initial hide (if appropriate)
    scheduleHideControls();

    return () => {
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchstart', onTouchStart);
      clearHideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, buffering, volumeDisplay, skipIndicator.visible]);

  // cleanup any local blob when component unmounts or track changes
  useEffect(() => {
    return () => {
      if (subtitleTrack && subtitleTrack.isLocalBlob && subtitleTrack.src) {
        try { URL.revokeObjectURL(subtitleTrack.src); } catch (e) {}
      }
      if (skipClearTimeoutRef.current) clearTimeout(skipClearTimeoutRef.current);
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
      clearHideTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Touch handlers (vertical drag & double-tap left/right / single tap)
  const handleTouchStart = (e) => {
    const touch = (e.touches && e.touches[0]);
    if (!touch) return;
    touchStartYRef.current = touch.clientY;
    touchStartXRef.current = touch.clientX;
    isVerticalDraggingRef.current = false;
    startVolumeRef.current = volume;
  };

  const handleTouchMove = (e) => {
    const touch = (e.touches && e.touches[0]);
    if (!touch) return;

    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    if (!isVerticalDraggingRef.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > VERTICAL_DRAG_THRESHOLD) {
      isVerticalDraggingRef.current = true;
      if (singleTapTimeoutRef.current) { clearTimeout(singleTapTimeoutRef.current); singleTapTimeoutRef.current = null; }
      lastTapTimeRef.current = 0;
      lastTapXRef.current = 0;
      setVolumeDisplay(true);
    }

    if (isVerticalDraggingRef.current) {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const height = rect ? rect.height : window.innerHeight;
      const deltaRatio = (touchStartYRef.current - touch.clientY) / Math.max(height, 1);
      let newVol = startVolumeRef.current + deltaRatio;
      newVol = Math.min(1, Math.max(0, newVol));
      setVolume(newVol);
      setVolumePercent(Math.round(newVol * 100));
      if (volumeRef.current) {
        try { volumeRef.current.value = newVol; } catch (err) {}
        volumeRef.current.style?.setProperty('--volume-percent', `${newVol * 100}%`);
      }
    }
  };

  const handleTouchEnd = (e) => {
    if (isVerticalDraggingRef.current) {
      setTimeout(() => setVolumeDisplay(false), 800);
      isVerticalDraggingRef.current = false;
      lastTapTimeRef.current = 0;
      lastTapXRef.current = 0;
      return;
    }

    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (!touch) return;
    const now = Date.now();
    const x = touch.clientX;
    const lastTime = lastTapTimeRef.current;
    const timeDiff = now - lastTime;
    const lastX = lastTapXRef.current || 0;
    const dx = Math.abs(x - lastX);

    if (timeDiff <= DOUBLE_TAP_DELAY_MS && dx < 100) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const half = (x - rect.left) < (rect.width / 2) ? 'left' : 'right';
      handleSkip(half);

      lastTapTimeRef.current = 0;
      lastTapXRef.current = 0;
      return;
    }

    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      togglePlay();
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY_MS + 10);

    lastTapTimeRef.current = now;
    lastTapXRef.current = x;
  };

  // timeupdate handler
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    const percent = v.duration ? (v.currentTime / v.duration) * 100 : 0;
    if (progressRef.current) {
      progressRef.current.value = percent;
      progressRef.current.style.setProperty('--played-percent', `${percent}%`);
    }
  };

  // Render
  return (
    <div className='container-wrapper'>
      {/* hidden subtitle file input */}
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".vtt,.srt,text/vtt,text/plain"
        style={{ display: 'none' }}
        onChange={onSubtitleFileInput}
      />

      <div className="current-video">
        <div
          className="custom-player"
          ref={containerRef}
          onClick={(e) => {
            // desktop click toggles immediately; on touch devices taps are handled in touchend
            if ((e.nativeEvent && e.nativeEvent.pointerType === 'touch') || ('ontouchstart' in window)) {
              return;
            }
            togglePlay();
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <video
            ref={videoRef}
            src={videoSrc}
            crossOrigin="anonymous"
            autoPlay
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onTimeUpdate={handleTimeUpdate}
            style={{ background: 'black' }}
            controls={false}
          >
            {/* attach track element if we have subtitleTrack */}
            {subtitleTrack && subtitleTrack.src && (
              <track
                key={subtitleTrack.src}
                src={subtitleTrack.src}
                kind="subtitles"
                srcLang="en"
                label={subtitleLabel || 'subs'}
                default={subtitleEnabled}
              />
            )}
          </video>

          {/* BUFFERING SPINNER */}
          {buffering && (
            <div className="buffering-overlay" aria-hidden={!buffering}>
              <div className="buffering-spinner" />
            </div>
          )}

          {volumeDisplay && <div className="volume-indicator">{volumePercent}%</div>}

          {/* Skip indicator */}
          {skipIndicator.visible && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: 8,
                zIndex: 9999,
                fontSize: 18,
                pointerEvents: 'none'
              }}
            >
              {skipIndicator.text}
            </div>
          )}

          <div
            className={`controls${controlsVisible ? '' : ' controls-hidden'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <ProgressBar
              duration={duration}
              currentTime={currentTime}
              progressRef={progressRef}
              hoverPreviewRef={hoverPreviewRef}
              previewTimeRef={previewTimeRef}
              videoRef={videoRef}
            />
            <PlayerControls
              playing={playing}
              ended={ended}
              muted={muted}
              fullscreen={fullscreen}
              currentTime={currentTime}
              duration={duration}
              volume={volume}
              videoRef={videoRef}
              volumeRef={volumeRef}
              setPlaying={setPlaying}
              setMuted={setMuted}
              setFullscreen={setFullscreen}
              setVolume={setVolume}
              setVolumePercent={setVolumePercent}
              setEnded={setEnded}
              containerRef={containerRef}
              changeVolume={changeVolume}
              playbackRate={playbackRate}
              setPlaybackRate={setPlaybackRate}
              subtitleLabel={subtitleLabel}
              subtitleEnabled={subtitleEnabled}
              onSubtitleUploadClick={onSubtitleUploadClick}
              toggleSubtitle={toggleSubtitle}
            />
          </div>
        </div>
        <div className="actionsRow">hello</div>
      </div>

      {randomNext.length > 0 && <NextPreviews randomNext={randomNext} />}
    </div>
  );
};

export default VideoPlayer;
