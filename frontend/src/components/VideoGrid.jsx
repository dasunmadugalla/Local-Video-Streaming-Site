// ../components/VideoGrid.jsx
import React from 'react';

const VideoGrid = ({ files, tagCategories, openTitleModal }) => (
  <div className="videoContainer">
    <div className="gridHeader">
      <div>File Name</div>
      <div>Size</div>
      {Object.keys(tagCategories).map(cat => (
        <div key={cat}>{cat} Tags</div>
      ))}
    </div>

    {files.map((file, index) => (
      <div className="gridRow" key={index}>
        <div title={file.fileName} onClick={() => openTitleModal(file.fileName)}>
          {file.fileName.length > 40 ? file.fileName.slice(0, 40) + '...' : file.fileName}
        </div>
        <div>{file.formattedSize}</div>
        {Object.keys(tagCategories).map(cat => (
          <div key={cat}>
            {(file.tags && file.tags[cat]) ? file.tags[cat].join(', ') : ''}
          </div>
        ))}
      </div>
    ))}
  </div>
);

export default VideoGrid;
