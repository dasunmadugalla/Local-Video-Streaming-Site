import React, { useEffect, useRef, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import {
  FaPlay, FaPause, FaExpand, FaCompress, FaVolumeUp, FaVolumeMute, FaUndo
} from 'react-icons/fa';
import { FileContext } from '../components/FileContext';
import VideoPreview from '../components/VideoPreview';
import '../styling/VideoPlayer.css';

const VideoPlayer = () => {
  const { fileName } = useParams();
  const videoSrc = `http://localhost:3000/videos/${encodeURIComponent(fileName)}`;

  const { visibleFiles } = useContext(FileContext);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const volumeRef = useRef(null);
  const hoverPreviewRef = useRef(null);
  const previewTimeRef = useRef(null);

  const [playing, setPlaying] = useState(true);
  const [ended, setEnded] = useState(false);
  const [volume, setVolume] = useState(() => {
    const savedVolume = localStorage.getItem('globalVolume');
    return savedVolume !== null ? parseFloat(savedVolume) : 1;
  });
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls] = useState(true);
  const [volumeDisplay, setVolumeDisplay] = useState(false);
  const [volumePercent, setVolumePercent] = useState(() => {
    const savedVolume = localStorage.getItem('globalVolume');
    return savedVolume !== null ? Math.round(parseFloat(savedVolume) * 100) : 100;
  });

  const [randomNext, setRandomNext] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3000/files?limit=8")
      .then(res => res.json())
      .then(data => {
        const filtered = data.files.filter(f => f !== fileName);
        setRandomNext(filtered);
      });
  }, [fileName]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume;
      if (volumeRef.current) {
        volumeRef.current.style.setProperty('--volume-percent', `${volume * 100}%`);
      }
      localStorage.setItem('globalVolume', volume);
    }
  }, [volume]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let intervalId = null;

    const startSkipping = (direction) => {
      intervalId = setInterval(() => {
        if (direction === 'forward') {
          video.currentTime = Math.min(video.currentTime + 5, video.duration);
        } else if (direction === 'backward') {
          video.currentTime = Math.max(video.currentTime - 5, 0);
        }
      }, 100);
    };

    const stopSkipping = () => {
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (!intervalId) startSkipping('forward');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!intervalId) startSkipping('backward');
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
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

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        stopSkipping();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      stopSkipping();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWheel = (e) => {
      const rect = video.getBoundingClientRect();
      const withinX = e.clientX >= rect.left && e.clientX <= rect.right;
      const withinY = e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (withinX && withinY) {
        e.preventDefault();

        const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);

        if (vertical) {
          changeVolume(e.deltaY < 0 ? 0.01 : -0.01);
        } else if (horizontal) {
          const seekStep = 0.05;
          video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + e.deltaX * seekStep));
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.addEventListener('ended', () => {
      setPlaying(false);
      setEnded(true);
    });
    return () => video.removeEventListener('ended', () => {});
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => setPlaying(false));
    }
  }, []);

  const changeVolume = (delta) => {
    setVolume((prev) => {
      const newVolume = Math.min(1, Math.max(0, prev + delta));
      setVolumePercent(Math.round(newVolume * 100));
      setVolumeDisplay(true);
      clearTimeout(window.hideTimeout);
      window.hideTimeout = setTimeout(() => setVolumeDisplay(false), 1000);
      return newVolume;
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (ended) {
      video.currentTime = 0;
      video.play();
      setPlaying(true);
      setEnded(false);
    } else if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    const percent = (video.currentTime / video.duration) * 100;
    setCurrentTime(video.currentTime);
    if (progressRef.current) {
      progressRef.current.value = percent;
      progressRef.current.style.setProperty('--played-percent', `${percent}%`);
    }
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const percent = e.target.value;
    video.currentTime = (percent / 100) * duration;
    progressRef.current.style.setProperty('--played-percent', `${percent}%`);
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    setDuration(video.duration);
  };

  const formatTime = (time) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(time % 60).toString().padStart(2, '0');
    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setVolumePercent(Math.round(vol * 100));
    if (volumeRef.current) {
      volumeRef.current.style.setProperty('--volume-percent', `${vol * 100}%`);
    }
  };

  const handleHoverPreview = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    if (time < 0 || time > duration) return;

    clearTimeout(window.hideTimeout);
    previewTimeRef.current.textContent = formatTime(time);
    hoverPreviewRef.current.style.display = 'block';
    hoverPreviewRef.current.style.left = `${e.clientX - rect.left}px`;
  };

  const hideHoverPreview = () => {
    if (hoverPreviewRef.current) {
      window.hideTimeout = setTimeout(() => {
        hoverPreviewRef.current.style.display = 'none';
      }, 50);
    }
  };

  return (
    <div className='container-wrapper'>
      <div className="current-video">
        <div className="custom-player" ref={containerRef} onClick={togglePlay}>
          <video
            ref={videoRef}
            src={videoSrc}
            autoPlay
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            style={{ background: 'black' }}
          />

          {volumeDisplay && (
            <div className="volume-indicator">{volumePercent}%</div>
          )}

          <div className={`controls ${showControls ? '' : 'hidden'}`} onClick={(e) => e.stopPropagation()}>
            <div className="progress-bar">
              <input
                ref={progressRef}
                type="range"
                min="0"
                max="100"
                defaultValue="0"
                onChange={handleSeek}
                className="progressBar"
                onMouseMove={handleHoverPreview}
                onMouseLeave={hideHoverPreview}
              />
              <div className="hover-preview" ref={hoverPreviewRef}>
                <span ref={previewTimeRef}></span>
              </div>
            </div>

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
          </div>
        </div>

        <div className="actionsRow">
          hello
        </div>
      </div>

      {randomNext.length > 0 && (
        <div className="nextPreviews">
          {randomNext.map((file, idx) => (
            <VideoPreview key={idx} file={file} />
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
