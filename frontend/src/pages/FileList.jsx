import React, { useEffect, useState, useContext } from 'react';
import VideoPreview from '../components/VideoPreview';
import { FaAngleDown } from 'react-icons/fa';
import { FileContext } from '../components/FileContext';
import { Link } from 'react-router-dom';
import '../styling/VideoGrid.css'

const FileList = () => {
  const {
    allCount, setAllCount,
    visibleFiles, setVisibleFiles,
    hasFetched, setHasFetched
  } = useContext(FileContext);

  const [loading, setLoading] = useState(!hasFetched);
  const [loadClicks, setLoadClicks] = useState(0); // Track clicks
  const MAX_LOADS = 5;
  const LOAD_COUNT = 10;

  useEffect(() => {
    if (hasFetched) return; // Prevent refetch if already done

    fetch(`http://localhost:3000/files?offset=0&limit=${LOAD_COUNT}`)
      .then(res => res.json())
      .then(data => {
        setAllCount(data.total);
        setVisibleFiles(data.files);
        setHasFetched(true);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading files:', err);
        setLoading(false);
      });
  }, [hasFetched, setAllCount, setVisibleFiles, setHasFetched]);

  const handleLoadMore = () => {
    fetch(`http://localhost:3000/files?offset=${visibleFiles.length}&limit=${LOAD_COUNT}`)
      .then(res => res.json())
      .then(data => {
        setVisibleFiles(prev => [...prev, ...data.files]);
        setLoadClicks(prev => prev + 1); // Increment load counter
      });
  };

  if (loading) {
    return (
      <div className="spinnerContainer">
        <div className="spinner"></div>
        <p>Loading videos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mainContainer">
        <div className="subContainer">
          {visibleFiles.map((file, index) => (
            <VideoPreview key={index} file={file} />
          ))}
        </div>

        {visibleFiles.length < allCount && loadClicks < MAX_LOADS && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={handleLoadMore}
              className='loadMoreBtn'
            >
              Load More <FaAngleDown className='icon' />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default FileList;
