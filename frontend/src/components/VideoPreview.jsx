// src/components/VideoPreview.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../utils/api';

const PLACEHOLDER_QUALITY = '—'; // visible placeholder while loading
const PREVIEW_TAG_CATEGORIES_KEY = 'previewTagCategories';
const TOUCH_PREVIEW_MIN_RATIO = 0.65;

const touchPreviewRegistry = new Map();
let activeTouchPreviewKey = null;

const isHoverPreviewSupportedGlobally = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
};

const syncActiveTouchPreview = () => {
  let bestKey = null;
  let bestRatio = 0;

  touchPreviewRegistry.forEach((entry, key) => {
    if (!entry || typeof entry.ratio !== 'number') return;
    if (entry.ratio < TOUCH_PREVIEW_MIN_RATIO) return;

    if (!bestKey || entry.ratio > bestRatio) {
      bestKey = key;
      bestRatio = entry.ratio;
    }
  });

  if (bestKey === activeTouchPreviewKey) return;

  if (activeTouchPreviewKey) {
    const activeEntry = touchPreviewRegistry.get(activeTouchPreviewKey);
    activeEntry?.stop?.();
  }

  activeTouchPreviewKey = bestKey;

  if (activeTouchPreviewKey) {
    const nextEntry = touchPreviewRegistry.get(activeTouchPreviewKey);
    nextEntry?.start?.();
  }
};

const registerTouchPreview = (key, handlers) => {
  if (!key || !handlers) return;
  touchPreviewRegistry.set(key, {
    ...handlers,
    ratio: 0,
  });
};

const updateTouchPreviewRatio = (key, ratio) => {
  const entry = touchPreviewRegistry.get(key);
  if (!entry) return;

  const nextRatio = Number.isFinite(ratio) ? ratio : 0;
  if (entry.ratio === nextRatio) return;

  entry.ratio = nextRatio;
  syncActiveTouchPreview();
};

const unregisterTouchPreview = (key) => {
  if (!touchPreviewRegistry.has(key)) return;

  const entry = touchPreviewRegistry.get(key);
  if (activeTouchPreviewKey === key) {
    entry?.stop?.();
    activeTouchPreviewKey = null;
  }

  touchPreviewRegistry.delete(key);
  syncActiveTouchPreview();
};

const stopAllTouchPreviews = () => {
  touchPreviewRegistry.forEach((entry) => entry?.stop?.());
  activeTouchPreviewKey = null;
};

const VideoPreview = React.forwardRef(({ file, onContextMenu, onSelectClick, isSelected = false }, ref) => {
  const videoRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(null); // seconds
  const [qualityLabel, setQualityLabel] = useState(PLACEHOLDER_QUALITY); // 'SD', 'HD', ... or placeholder
  const [selectedPreviewCategories, setSelectedPreviewCategories] = useState([]);
  const [videoTags, setVideoTags] = useState({});
  const currentClipIndex = useRef(0);
  const slotCache = useRef(null);
  const previewInstanceKeyRef = useRef(`preview-${Math.random().toString(36).slice(2)}`);

  const encodedName = file;
  const displayName = (file && file.includes('::')) ? file.split('::').slice(1).join('::') : file;
  const videoSrc = `${API_BASE}/videos/${encodeURIComponent(encodedName)}`;

  const buildSlotCache = (video) => {
    if (!video || !isFinite(video.duration) || isNaN(video.duration)) return;
    if (slotCache.current) return;

    const durationSec = video.duration;
    const segmentLength = 1;
    const slots = [0.02, 0.2, 0.3, 0.5, 0.7, 0.9, 0.95, 0.975, 0.99];
    slotCache.current = slots.map(percent => {
      const start = durationSec * percent;
      const end = Math.min(start + segmentLength, durationSec);
      return { start, end };
    });
  };

  const startPreviewPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!isFinite(video.duration) || isNaN(video.duration)) return;

    buildSlotCache(video);
    if (!slotCache.current?.length) return;

    currentClipIndex.current = 0;
    video.currentTime = slotCache.current[0].start;
    video.muted = true;
    video.play().catch(() => {});
  };

  const stopPreviewPlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = slotCache.current?.[0]?.start || 0;
    currentClipIndex.current = 0;
  };

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

  const loadSelectedPreviewCategories = () => {
    try {
      const raw = localStorage.getItem(PREVIEW_TAG_CATEGORIES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setSelectedPreviewCategories(parsed.slice(0, 2));
        return;
      }
    } catch {
      // ignore malformed localStorage
    }
    setSelectedPreviewCategories([]);
  };

  useEffect(() => {
    loadSelectedPreviewCategories();

    const onStorage = (event) => {
      if (!event || event.key === PREVIEW_TAG_CATEGORIES_KEY) {
        loadSelectedPreviewCategories();
      }
    };

    window.addEventListener('storage', onStorage);

    let bc;
    try {
      bc = new BroadcastChannel('app_updates');
      bc.onmessage = (event) => {
        if (event?.data?.type === 'previewTagCategoriesChanged') {
          loadSelectedPreviewCategories();
        }
      };
    } catch {
      bc = null;
    }

    const onLocalEvent = () => loadSelectedPreviewCategories();
    window.addEventListener('preview_tag_categories_changed', onLocalEvent);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('preview_tag_categories_changed', onLocalEvent);
      if (bc) bc.close();
    };
  }, []);

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
    setVideoTags({});
    currentClipIndex.current = 0;
    slotCache.current = null;
  }, [file]);

  useEffect(() => {
    if (!encodedName) {
      setVideoTags({});
      return;
    }

    fetch(`${API_BASE}/api/videoDetails?fileName=${encodeURIComponent(encodedName)}`)
      .then((res) => res.json())
      .then((data) => setVideoTags(data?.tags || {}))
      .catch(() => setVideoTags({}));
  }, [encodedName]);

  useEffect(() => {
    if (isHoverPreviewSupportedGlobally()) return;

    const target = videoRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const key = previewInstanceKeyRef.current;
    registerTouchPreview(key, {
      start: startPreviewPlayback,
      stop: stopPreviewPlayback,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
        updateTouchPreviewRatio(key, ratio);
      },
      {
        threshold: [0, 0.25, 0.5, 0.65, 0.85, 1],
      }
    );

    observer.observe(target);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllTouchPreviews();
      } else {
        syncActiveTouchPreview();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unregisterTouchPreview(key);
    };
  }, [encodedName]);

  const handleMouseEnter = () => {
    startPreviewPlayback();
  };

  const handleMouseLeave = () => {
    stopPreviewPlayback();
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

  const previewTagRows = selectedPreviewCategories
    .map((category) => {
      const tags = Array.isArray(videoTags[category]) ? videoTags[category] : [];
      return tags.length > 0 ? { category, tags } : null;
    })
    .filter(Boolean);

  return (
    <div
      className={`videoBoxWrapper ${isSelected ? 'selectedPreview' : ''}`.trim()}
      onContextMenu={onContextMenu}
      onClickCapture={onSelectClick}
    >
      <div
        className={`videoBox ${isLoaded ? '' : 'shimmer'}`}
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link to={`/watch/${encodeURIComponent(encodedName)}`} className='videoLink'>
          <div className="videoInner">
            <video
              ref={videoRef}
              className="videoElm"
              src={videoSrc}
              preload="metadata"
              playsInline
              muted
              autoPlay={false}
              controls={false}
              disablePictureInPicture
              onTimeUpdate={handleTimeUpdate}
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

      {previewTagRows.length > 0 && (
        <div className="previewTagsWrap">
          {previewTagRows.map(({ category, tags }) => (
            <p key={category} className="previewTagLine">
              <span className="previewTagCategory">{category}:</span>{' '}
              {tags.map((tag, index) => (
                <React.Fragment key={`${category}-${tag}-${index}`}>
                  <Link
                    to={`/tag/${encodeURIComponent(tag)}?page=1`}
                    className="previewTagLink"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {tag}
                  </Link>
                  {index < tags.length - 1 ? ', ' : ''}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

export default VideoPreview;
