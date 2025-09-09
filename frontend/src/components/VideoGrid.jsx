import React, { useRef, useState, useEffect } from 'react';
import { FaCheckSquare, FaSquare } from 'react-icons/fa';

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
            backgroundColor: 'rgba(0, 123, 255, 0.2)',
            border: '1px solid #007bff',
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
        const fileKey = file.fileName;
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
                openTitleModal(file.fileName);
              }
            }}
            style={{ cursor: selectMode ? 'pointer' : 'default' }}
          >
            {selectMode && (
              <div className="checkboxCell">
                {isSelected ? <FaCheckSquare /> : <FaSquare />}
              </div>
            )}
            <div>
              {file.fileName.length > 40 ? file.fileName.slice(0, 40) + '...' : file.fileName}
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


// import React, { useRef, useState, useEffect } from 'react';
// import { FaCheckSquare, FaSquare } from 'react-icons/fa';

// const VideoGrid = ({
//   files,
//   tagCategories,
//   openTitleModal,
//   selectMode,
//   selectedHashes = [],
//   setSelectedHashes = () => {}
// }) => {
//   const rowRefs = useRef({});
//   const [isDragging, setIsDragging] = useState(false);
//   const startY = useRef(0);
//   const endY = useRef(0);

//   useEffect(() => {
//     const handleMouseMove = (e) => {
//       if (isDragging) {
//         endY.current = e.clientY;
//       }
//     };

//     const handleMouseUp = () => {
//       if (!isDragging) return;

//       const [minY, maxY] = [startY.current, endY.current].sort((a, b) => a - b);
//       const newlySelected = [];

//       Object.entries(rowRefs.current).forEach(([key, el]) => {
//         const rect = el.getBoundingClientRect();
//         const midY = rect.top + rect.height / 2;
//         if (midY >= minY && midY <= maxY) {
//           newlySelected.push(key);
//         }
//       });

//       setSelectedHashes(prev => [...new Set([...prev, ...newlySelected])]);
//       setIsDragging(false);
//     };

//     window.addEventListener('mousemove', handleMouseMove);
//     window.addEventListener('mouseup', handleMouseUp);
//     return () => {
//       window.removeEventListener('mousemove', handleMouseMove);
//       window.removeEventListener('mouseup', handleMouseUp);
//     };
//   }, [isDragging, setSelectedHashes]);

//   const handleMouseDown = (e) => {
//     if (!selectMode) return;
//     setIsDragging(true);
//     startY.current = e.clientY;
//     endY.current = e.clientY;
//   };

//   const toggleSelection = (fileKey) => {
//     if (selectedHashes.includes(fileKey)) {
//       setSelectedHashes(selectedHashes.filter(k => k !== fileKey));
//     } else {
//       setSelectedHashes([...selectedHashes, fileKey]);
//     }
//   };

//   return (
//     <div
//       className="videoContainer"
//       onMouseDown={handleMouseDown}
//       style={{ userSelect: 'none' }}
//     >
//       <div className="gridHeader">
//         {selectMode && <div>Select</div>}
//         <div>File Name</div>
//         <div>Size</div>
//         {Object.keys(tagCategories).map(cat => (
//           <div key={cat}>{cat} Tags</div>
//         ))}
//       </div>

//       {files.map((file) => {
//         const fileKey = file.fileName;
//         const isSelected = selectedHashes.includes(fileKey);

//         return (
//           <div
//             className={`gridRow ${isSelected ? 'selectedRow' : ''}`}
//             key={fileKey}
//             ref={el => rowRefs.current[fileKey] = el}
//             onClick={() => {
//               if (selectMode) {
//                 toggleSelection(fileKey);
//               } else {
//                 openTitleModal(file.fileName);
//               }
//             }}
//             style={{ cursor: selectMode ? 'pointer' : 'default' }}
//           >
//             {selectMode && (
//               <div className="checkboxCell">
//                 {isSelected ? <FaCheckSquare /> : <FaSquare />}
//               </div>
//             )}
//             <div>
//               {file.fileName.length > 40 ? file.fileName.slice(0, 40) + '...' : file.fileName}
//             </div>
//             <div>{file.formattedSize}</div>
//             {Object.keys(tagCategories).map(cat => (
//               <div key={cat}>
//                 {(file.tags && file.tags[cat]) ? file.tags[cat].join(', ') : ''}
//               </div>
//             ))}
//           </div>
//         );
//       })}
//     </div>
//   );
// };

// export default VideoGrid;
