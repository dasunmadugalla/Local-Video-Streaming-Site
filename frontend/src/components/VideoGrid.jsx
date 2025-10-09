// src/components/VideoGrid.jsx
import React, { useRef, useState, useEffect } from 'react';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';

const TRUNCATE_LIMIT = 40;

const VideoGrid = ({
  files,
  tagCategories,
  openTitleModal,
  selectMode,
  selectedHashes = [],
  setSelectedHashes = () => {}
}) => {
  const rowRefs = useRef({});
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragBox, setDragBox] = useState(null);

  const startCoords = useRef({ x: 0, y: 0 });
  const endCoords = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        endCoords.current = { x: e.clientX, y: e.clientY };

        const box = {
          left: Math.min(startCoords.current.x, endCoords.current.x),
          top: Math.min(startCoords.current.y, endCoords.current.y),
          width: Math.abs(startCoords.current.x - endCoords.current.x),
          height: Math.abs(startCoords.current.y - endCoords.current.y),
        };

        setDragBox(box);
      }
    };

    const handleMouseUp = () => {
      if (!isDragging) return;

      setIsDragging(false);
      setDragBox(null);

      const [minY, maxY] = [startCoords.current.y, endCoords.current.y].sort((a, b) => a - b);
      const newlySelected = [];

      Object.entries(rowRefs.current).forEach(([key, el]) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (midY >= minY && midY <= maxY) {
          newlySelected.push(key);
        }
      });

      setSelectedHashes(prev => [...new Set([...prev, ...newlySelected])]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setSelectedHashes]);

  const handleMouseDown = (e) => {
    if (!selectMode || e.button !== 0) return;
    setIsDragging(true);
    startCoords.current = { x: e.clientX, y: e.clientY };
    endCoords.current = { x: e.clientX, y: e.clientY };
    setDragBox(null);
  };

  const toggleSelection = (fileKey) => {
    if (selectedHashes.includes(fileKey)) {
      setSelectedHashes(selectedHashes.filter(k => k !== fileKey));
    } else {
      setSelectedHashes([...selectedHashes, fileKey]);
    }
  };

  const decodeDisplayName = (encoded) => {
    if (!encoded) return '';
    if (encoded.includes('::')) {
      return encoded.split('::').slice(1).join('::');
    }
    return encoded;
  };

  const truncated = (name) => {
    if (!name) return '';
    return name.length > TRUNCATE_LIMIT ? (name.slice(0, TRUNCATE_LIMIT) + '...') : name;
  };

  return (
    <div
      ref={containerRef}
      className="videoContainer"
      onMouseDown={handleMouseDown}
      style={{ userSelect: 'none', position: 'relative' }}
    >
      {dragBox && (
        <div
          className="drag-selection-box"
          style={{
            position: 'fixed',
            left: dragBox.left,
            top: dragBox.top,
            width: dragBox.width,
            height: dragBox.height,
            backgroundColor: 'rgba(0, 123, 255, 0.12)',
            border: '1px solid rgba(0, 123, 255, 0.6)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}

      <div className="gridHeader">
        {selectMode && <div>Select</div>}
        <div>File Name</div>
        <div>Size</div>
        {Object.keys(tagCategories).map(cat => (
          <div key={cat}>{cat} Tags</div>
        ))}
      </div>

      {files.map((file) => {
        // file.fileName is expected to be encoded: "folderId::realFilename.ext"
        const encodedName = file.fileName || file; // fallback if file is a string
        const fileKey = encodedName;
        const displayName = decodeDisplayName(encodedName);
        const shortName = truncated(displayName);
        const isSelected = selectedHashes.includes(fileKey);

        return (
          <div
            className={`gridRow ${isSelected ? 'selectedRow' : ''}`}
            key={fileKey}
            ref={el => rowRefs.current[fileKey] = el}
            onClick={() => {
              if (selectMode) {
                toggleSelection(fileKey);
              } else {
                openTitleModal(fileKey);
              }
            }}
            style={{ cursor: selectMode ? 'pointer' : 'default' }}
          >
            {selectMode && (
              <div className="checkboxCell">
                {isSelected ? <FaCheckSquare /> : <FaSquare />}
              </div>
            )}
            <div title={displayName}>
              {shortName}
            </div>
            <div>{file.formattedSize}</div>
            {Object.keys(tagCategories).map(cat => (
              <div key={cat}>
                {(file.tags && file.tags[cat]) ? file.tags[cat].join(', ') : ''}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default VideoGrid;
