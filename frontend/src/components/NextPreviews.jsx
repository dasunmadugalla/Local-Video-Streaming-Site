import React from 'react';
import VideoPreview from './VideoPreview';

const NextPreviews = ({ randomNext, onContextMenu }) => (
  <div className="nextPreviews subContainer">
    {randomNext.map((file, idx) => (
      <VideoPreview
        key={idx}
        file={file}
        onContextMenu={onContextMenu ? (e) => onContextMenu(e, file) : undefined}
      />
    ))}
  </div>
);

export default NextPreviews;
