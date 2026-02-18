import React from 'react';

const ProgressBar = ({ duration, progressRef, hoverPreviewRef, previewTimeRef, videoRef, bufferedPercent = 0 }) => {

  const formatTime = (time) => {
    const mins = Math.floor(time / 60).toString().padStart(2, '0');
    const secs = Math.floor(time % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleSeek = (e) => {
    videoRef.current.currentTime = (e.target.value / 100) * duration;
    progressRef.current.style.setProperty('--played-percent', `${e.target.value}%`);
  };

  const handleHover = (e) => {
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * duration;
    if (time >= 0 && time <= duration) {
      clearTimeout(window.hideTimeout);
      previewTimeRef.current.textContent = formatTime(time);
      hoverPreviewRef.current.style.display = 'block';
      hoverPreviewRef.current.style.left = `${e.clientX - rect.left}px`;
    }
  };

  const hideHover = () => {
    window.hideTimeout = setTimeout(() => {
      hoverPreviewRef.current.style.display = 'none';
    }, 50);
  };

  return (
    <div className="progress-bar">
      <input
        ref={progressRef}
        type="range"
        min="0"
        max="100"
        defaultValue="0"
        className="progressBar"
        onChange={handleSeek}
        onMouseMove={handleHover}
        onMouseLeave={hideHover}
        style={{ '--buffered-percent': `${bufferedPercent}%` }}
      />
      <div className="hover-preview" ref={hoverPreviewRef}>
        <span ref={previewTimeRef}></span>
      </div>
    </div>
  );
};

export default ProgressBar;
