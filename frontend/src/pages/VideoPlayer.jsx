import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaUndo } from 'react-icons/fa';
import VideoPreview from '../components/VideoPreview';
import PlayerControls from '../components/PlayerControls';
import ProgressBar from '../components/ProgressBar';
import NextPreviews from '../components/NextPreviews';
import '../styling/VideoPlayer.css';

const VideoPlayer = () => {
  const { fileName } = useParams();
  const navigate = useNavigate();
  const videoSrc = `http://localhost:3000/videos/${encodeURIComponent(fileName)}`;

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const hoverPreviewRef = useRef(null);
  const previewTimeRef = useRef(null);

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

  useEffect(() => {
    fetch(videoSrc, { method: 'HEAD' })
      .then(res => { if (!res.ok) navigate('/'); })
      .catch(() => navigate('/'));
  }, [fileName]);

  useEffect(() => {
    fetch("http://localhost:3000/random?limit=8")
      .then(res => res.json())
      .then(data => setRandomNext(data.filter(f => f !== fileName)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [fileName]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      volumeRef.current?.style.setProperty('--volume-percent', `${volume * 100}%`);
      localStorage.setItem('globalVolume', volume);
    }
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWheel = (e) => {
      const rect = video.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        e.preventDefault();
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? changeVolume(e.deltaY < 0 ? 0.01 : -0.01) :
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + e.deltaX * 0.05));
      }
    };

    const handleEnded = () => { setPlaying(false); setEnded(true); };

    window.addEventListener('wheel', handleWheel, { passive: false });
    video.addEventListener('ended', handleEnded);
    video.play().catch(() => setPlaying(false));

    return () => {
      window.removeEventListener('wheel', handleWheel);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleKeyDown = (e) => {
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
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
            setFullscreen(false);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [muted, fullscreen, ended]);

  const changeVolume = (delta) => {
    setVolume(prev => {
      const newVol = Math.min(1, Math.max(0, prev + delta));
      setVolumePercent(Math.round(newVol * 100));
      setVolumeDisplay(true);
      clearTimeout(window.hideTimeout);
      window.hideTimeout = setTimeout(() => setVolumeDisplay(false), 1000);
      return newVol;
    });
  };

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

  return (
    <div className='container-wrapper'>
      <div className="current-video">
        <div className="custom-player" ref={containerRef} onClick={togglePlay}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            onTimeUpdate={() => {
              const v = videoRef.current;
              setCurrentTime(v.currentTime);
              const percent = (v.currentTime / v.duration) * 100;
              progressRef.current.value = percent;
              progressRef.current.style.setProperty('--played-percent', `${percent}%`);
            }}
            style={{ background: 'black' }}
          />

          {volumeDisplay && <div className="volume-indicator">{volumePercent}%</div>}

          <div className="controls" onClick={(e) => e.stopPropagation()}>
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
