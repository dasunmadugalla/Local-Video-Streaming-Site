import React, { useRef, useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';

const VideoPreview = forwardRef(({ file }, ref) => {
  const videoRef = useRef(null);
  const videoSrc = `http://localhost:3000/videos/${encodeURIComponent(file)}`;
  // const [previewParts, setPreviewParts] = useState([]);
  const currentClipIndex = useRef(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const slotCache = useRef(null);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video || isNaN(video.duration)) return;

    if (!slotCache.current) {
      const duration = video.duration;
      const segmentLength = 1;
      const slots = [0.02, 0.2, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.99];
      slotCache.current = slots.map(percent => {
        const start = duration * percent;
        const end = Math.min(start + segmentLength, duration);
        return { start, end };
      });
    }

    // setPreviewParts(slotCache.current);
    currentClipIndex.current = 0;
    video.currentTime = slotCache.current[0].start;
    video.play();
    video.muted = true;
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = slotCache.current?.[0]?.start || 0;
      currentClipIndex.current = 0;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !slotCache.current || slotCache.current.length === 0) return;

    const current = slotCache.current[currentClipIndex.current];
    if (video.currentTime >= current.end) {
      currentClipIndex.current = (currentClipIndex.current + 1) % slotCache.current.length;
      video.currentTime = slotCache.current[currentClipIndex.current].start;
    }
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  return (
    <div className='videoBoxWrapper'>
      <div
        className={`videoBox ${isLoaded ? '' : 'shimmer'}`}
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link to={`/watch/${encodeURIComponent(file)}`} className='videoLink'>
          <video
            ref={videoRef}
            src={videoSrc}
            preload="metadata"
            onTimeUpdate={handleTimeUpdate}
            controls={false}
            onLoadedData={handleLoadedData}
          />
        </Link>
      </div>
      <p className='title'
        style={{
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
        }}
      >
        {file}
      </p>
    </div>
  );
});

export default VideoPreview;