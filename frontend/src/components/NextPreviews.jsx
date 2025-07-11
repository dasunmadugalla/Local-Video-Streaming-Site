import React from 'react';
import VideoPreview from './VideoPreview';

const NextPreviews = ({ randomNext }) => (
  <div className="nextPreviews subContainer">
    {randomNext.map((file, idx) => (
      <VideoPreview key={idx} file={file} />
    ))}
  </div>
);

export default NextPreviews;
