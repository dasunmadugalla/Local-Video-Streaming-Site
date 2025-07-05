import React, { useEffect, useState, useContext } from 'react';
import VideoPreview from '../components/VideoPreview';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { FileContext } from '../components/FileContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import '../styling/VideoGrid.css';

const FileList = ({ isHome }) => {
  const {
    allCount, setAllCount,
    visibleFiles, setVisibleFiles,
    hasFetched, setHasFetched,
    shuffledCache, setShuffledCache
  } = useContext(FileContext);

  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(isHome ? 1 : pageParam);

  const LOAD_COUNT = 12;

  const fetchPage = (currentPage) => {
    const offset = (currentPage - 1) * LOAD_COUNT;

    setLoading(true);

    // ✅ Only reshuffle if no cached list exists
    if (shuffledCache.length === 0) {
      fetch(`http://localhost:3000/files?offset=${offset}&limit=${LOAD_COUNT}&reshuffle=true`)
        .then(res => res.json())
        .then(data => {
          setAllCount(data.total);
          setShuffledCache(data.fullList); // Save reshuffled list globally
          setVisibleFiles(data.fullList.slice(offset, offset + LOAD_COUNT));
          setHasFetched(true);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading files:', err);
          setLoading(false);
        });
    } else {
      // ✅ Use existing cache for consistent video order
      setVisibleFiles(shuffledCache.slice(offset, offset + LOAD_COUNT));
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHome) {
      setPage(1);
    } else {
      setPage(pageParam);
    }
  }, [location.pathname, isHome, pageParam]);

  useEffect(() => {
    fetchPage(page);
  }, [page]);

  const totalPages = Math.ceil(allCount / LOAD_COUNT);

  const getPageNumbers = () => {
    const pages = [];
    const maxDisplay = 5;
    let start = Math.max(page - 2, 1);
    let end = Math.min(start + maxDisplay - 1, totalPages);

    if (end - start < maxDisplay - 1) {
      start = Math.max(end - maxDisplay + 1, 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const goToPage = (newPage) => {
    if (newPage === 1) {
      navigate('/');
    } else {
      navigate(`/videos?page=${newPage}`);
    }
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

        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>

          <button onClick={() => goToPage(1)} disabled={page === 1} className='btn btnWrapper'>
            <FaAngleDoubleLeft /> First
          </button>

          <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='btn btnWrapper'>
            <FaAngleLeft /> Prev
          </button>

          {getPageNumbers().map(num => (
            <button key={num} onClick={() => goToPage(num)} className={`btn ${num === page ? 'activePage' : ''}`}>
              {num}
            </button>
          ))}

          <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className='btn btnWrapper'>
            Next <FaAngleRight />
          </button>

          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className='btn btnWrapper'>
            Last <FaAngleDoubleRight />
          </button>

        </div>
      </div>
    </>
  );
};

export default FileList;
