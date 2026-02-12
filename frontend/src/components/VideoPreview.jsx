// src/components/VideoPreview.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../utils/api';

const PLACEHOLDER_QUALITY = '—'; // visible placeholder while loading

const VideoPreview = React.forwardRef(({ file, onContextMenu, onSelectClick, isSelected = false }, ref) => {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(null); // seconds
  const [qualityLabel, setQualityLabel] = useState(PLACEHOLDER_QUALITY); // 'SD', 'HD', ... or placeholder
  const currentClipIndex = useRef(0);
  const slotCache = useRef(null);

  const encodedName = file;
  const displayName = (file && file.includes('::')) ? file.split('::').slice(1).join('::') : file;
  const videoSrc = `${API_BASE}/videos/${encodeURIComponent(encodedName)}`;

  const formatDuration = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '--:--';
    const total = Math.round(sec);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const mapHeightToLabel = (height) => {
    if (!height || isNaN(height)) return PLACEHOLDER_QUALITY;
    if (height <= 480) return 'SD';
    if (height <= 720) return 'HD';
    if (height <= 1080) return 'FHD';
    if (height <= 2160) return '4K';
    return `${Math.round(height)}p`;
  };

  // Reset component state when `file` changes so previous metadata doesn't linger
  useEffect(() => {
    try {
      const v = videoRef.current;
      if (v) {
        v.pause();
        try { v.currentTime = 0; } catch { /* ignore seeking errors */ }
      }
    } catch { /* noop */ }

    setIsLoaded(false);
    setDuration(null);
    setQualityLabel(PLACEHOLDER_QUALITY);
    currentClipIndex.current = 0;
    slotCache.current = null;
  }, [file]);

  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isNaN(video.duration) || !isFinite(video.duration)) return;

    if (!slotCache.current) {
      const durationSec = video.duration;
      const segmentLength = 1;
      const slots = [0.02, 0.2, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.99];
      slotCache.current = slots.map(percent => {
        const start = durationSec * percent;
        const end = Math.min(start + segmentLength, durationSec);
        return { start, end };
      });
    }

    currentClipIndex.current = 0;
    video.currentTime = slotCache.current[0].start;
    video.muted = true;
    video.play().catch(() => {});
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

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const dur = isNaN(video.duration) ? null : video.duration;
    setDuration(dur);

    const vh = video.videoHeight || null;
    setQualityLabel(mapHeightToLabel(vh));

    setIsLoaded(true);
  };

  const handleLoadedData = () => {
    setIsLoaded(true);
  };

  return (
    <div className={`videoBoxWrapper ${isSelected ? 'selectedPreview' : ''}`.trim()}>
      <div
        className={`videoBox ${isLoaded ? '' : 'shimmer'}`}
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={onContextMenu}
        onClickCapture={onSelectClick}
      >
        <Link to={`/watch/${encodeURIComponent(encodedName)}`} className='videoLink'>
          <div className="videoInner">
            <video
              ref={videoRef}
              className="videoElm"
              src={videoSrc}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              controls={false}
              onLoadedMetadata={handleLoadedMetadata}
              onLoadedData={handleLoadedData}
            />
            <div className="videoQualityOverlay" aria-hidden="true">
              <span className="videoQuality">{qualityLabel}</span>
            </div>

            <div className="videoDurationOverlay" aria-hidden="true">
              <span className="videoDuration">{formatDuration(duration)}</span>
            </div>
          </div>
        </Link>
      </div>
      <p className='title'>
        {displayName}
      </p>
    </div>
  );
});

export default VideoPreview;
