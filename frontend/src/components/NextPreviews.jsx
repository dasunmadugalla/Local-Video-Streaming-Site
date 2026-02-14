import React from 'react';
import VideoPreview from './VideoPreview';

const NextPreviews = ({ randomNext, onContextMenu, onSelectClick, selectedFiles = [] }) => (
  <div className="nextPreviews subContainer">
    {randomNext.map((file, idx) => (
      <VideoPreview
        key={idx}
        file={file}
        isSelected={selectedFiles.includes(file)}
        onSelectClick={onSelectClick ? (e) => onSelectClick(e, file) : undefined}
        onContextMenu={onContextMenu ? (e) => onContextMenu(e, file) : undefined}
      />
    ))}
  </div>
);

export default NextPreviews;