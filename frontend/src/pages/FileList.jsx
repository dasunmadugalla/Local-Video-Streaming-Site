import React, { useEffect, useState, useContext, useCallback } from 'react';
import VideoPreview from '../components/VideoPreview';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { FileContext } from '../components/FileContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import TagModal from '../components/TagModal';
import '../styling/VideoGrid.css';
import { API_BASE } from '../utils/api';

const LOAD_COUNT = 15;

const normalizeToEncodedStrings = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      if (item.fileName) return item.fileName;
      if (item.encodedName) return item.encodedName;
    }
    return String(item);
  });
};

const FileList = ({ isHome }) => {
  const {
    allCount, setAllCount,
    visibleFiles, setVisibleFiles,
    hasFetched, setHasFetched,
    shuffledCache, setShuffledCache
  } = useContext(FileContext);

  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ message: '', type: '' });
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [tagCategories, setTagCategories] = useState({});
  const [tagInputs, setTagInputs] = useState({});
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(isHome ? 1 : pageParam);

  const fetchPage = useCallback(async (currentPage) => {
    const offset = (currentPage - 1) * LOAD_COUNT;
    setLoading(true);

    try {
      if (Array.isArray(shuffledCache) && shuffledCache.length > 0) {
        const encodedCache = normalizeToEncodedStrings(shuffledCache);
        if (!allCount || allCount === 0) setAllCount(encodedCache.length);
        setVisibleFiles(encodedCache.slice(offset, offset + LOAD_COUNT));
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/files?offset=${offset}&limit=${LOAD_COUNT}&reshuffle=true`);
      const data = await res.json();
      const fullListRaw = data.fullList || data.files || [];
      const fullList = normalizeToEncodedStrings(fullListRaw);

      setShuffledCache(fullList);
      setAllCount(data.total || fullList.length || 0);

      const slice = fullList.slice(offset, offset + LOAD_COUNT);
      setVisibleFiles(slice);
      setHasFetched(true);
      setLoading(false);
    } catch (err) {
      console.error('Error loading files (FileList):', err);
      try {
        const fallback = await fetch(`${API_BASE}/allfiles`);
        const fallData = await fallback.json();
        const fullList = normalizeToEncodedStrings(fallData || []);
        setShuffledCache(fullList);
        setAllCount(fullList.length);
        const offset = (page - 1) * LOAD_COUNT;
        setVisibleFiles(fullList.slice(offset, offset + LOAD_COUNT));
      } catch (err2) {
        console.error('Fallback /allfiles failed:', err2);
        setVisibleFiles([]);
        setAllCount(0);
      }
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffledCache, setShuffledCache, setVisibleFiles, setAllCount, setHasFetched]);

  // react to page/url changes
  useEffect(() => {
    if (isHome) setPage(1);
    else setPage(pageParam);
  }, [location.pathname, isHome, pageParam]);

  useEffect(() => {
    fetchPage(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchCategories = useCallback(() => {
    fetch(`${API_BASE}/api/tagCategories`)
      .then(res => res.json())
      .then(data => setTagCategories(data || {}))
      .catch(err => console.error('Failed to load categories', err));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openTitleModal = useCallback((fileName) => {
    setSelectedFile(fileName);
    setTitleInput('');
    const initialTags = {};

    fetch(`${API_BASE}/api/videoDetails?fileName=${encodeURIComponent(fileName)}`)
      .then(res => res.json())
      .then(data => {
        setTitleInput(data.title || '');
        Object.keys(tagCategories).forEach(cat => {
          initialTags[cat] = (data.tags && data.tags[cat]) ? data.tags[cat] : [];
        });
        setTagInputs(initialTags);
        setShowTitleModal(true);
      })
      .catch(err => console.error('Failed to load video details', err));
  }, [tagCategories]);

  const removeTag = (category, index) => {
    const updated = (tagInputs[category] || []).filter((_, i) => i !== index);
    setTagInputs({ ...tagInputs, [category]: updated });
  };

  const handleTitleSave = () => {
    const tags = {};
    Object.entries(tagInputs).forEach(([cat, arr]) => {
      if (Array.isArray(arr) && arr.length) tags[cat] = arr;
    });

    fetch(`${API_BASE}/api/updateVideo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: selectedFile, title: titleInput.trim(), tags })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPopup({ message: 'Video updated successfully', type: 'success' });
        } else {
          setPopup({ message: 'Failed to update video', type: 'error' });
        }
        setShowTitleModal(false);
      })
      .catch(err => {
        console.error('Error:', err);
        setPopup({ message: 'Failed to update video', type: 'error' });
        setShowTitleModal(false);
      });
  };

  useEffect(() => {
    if (popup.message) {
      const timer = setTimeout(() => setPopup({ message: '', type: '' }), 2500);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // Listen to global updates (from Settings or other tabs) and refetch
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('app_updates');
      bc.onmessage = (e) => {
        if (e.data && e.data.type === 'foldersChanged') {
          // clear cache and re-fetch current page
          try { setShuffledCache([]); } catch (err) {}
          fetchPage(page);
        }
      };
    } catch (err) {
      // BroadcastChannel not available — no-op
      bc = null;
    }

    // Also listen for a custom DOM event fallback
    const handler = () => {
      try { setShuffledCache([]); } catch (err) {}
      fetchPage(page);
    };
    window.addEventListener('app_folders_changed', handler);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('app_folders_changed', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, fetchPage, setShuffledCache]);

  const totalPages = Math.max(1, Math.ceil((allCount || 0) / LOAD_COUNT));

  const getPageNumbers = () => {
    const pages = [];
    const maxDisplay = 5;
    let start = Math.max(page - 2, 1);
    let end = Math.min(start + maxDisplay - 1, totalPages);

    if (end - start < maxDisplay - 1) start = Math.max(end - maxDisplay + 1, 1);

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToPage = (newPage) => {
    if (newPage === 1) navigate('/');
    else navigate(`/videos?page=${newPage}`);
  };

  const startIndex = (allCount && allCount > 0) ? ((page - 1) * LOAD_COUNT + 1) : (visibleFiles.length > 0 ? ((page - 1) * LOAD_COUNT + 1) : 0);
  const endIndex = (allCount && allCount > 0) ? Math.min(page * LOAD_COUNT, allCount) : (visibleFiles.length ? ((page - 1) * LOAD_COUNT + visibleFiles.length) : 0);

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
          <h2 style={{ marginBottom: 6 }}>{isHome ? 'Home' : 'All videos'}</h2>
          <div style={{ color: 'var(--progress_grey)', fontSize: 13 }}>
            {allCount || 0} result{(allCount || 0) === 1 ? '' : 's'}
          </div>
        </div>

        <div style={{ color: 'var(--progress_grey)', marginBottom: 12, fontSize: 13 }}>
          {(allCount || visibleFiles.length) > 0 ? `Showing ${startIndex}–${endIndex} of ${allCount || visibleFiles.length}` : 'No videos found'}
        </div>

        <div className="subContainer">
          {visibleFiles.map((file, index) => (
            <VideoPreview
              key={index}
              file={file}
              onContextMenu={isHome ? (e) => {
                e.preventDefault();
                openTitleModal(file);
              } : undefined}
            />
          ))}
        </div>

        {popup.message && (
          <div className={`popup ${popup.type}`}>
            {popup.message}
          </div>
        )}

        {showTitleModal && (
          <TagModal
            titleInput={titleInput}
            setTitleInput={setTitleInput}
            tagCategories={tagCategories}
            tagInputs={tagInputs}
            setTagInputs={setTagInputs}
            removeTag={removeTag}
            onSave={handleTitleSave}
            onClose={() => setShowTitleModal(false)}
          />
        )}

        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => goToPage(1)} disabled={page === 1} className='btn btnWrapper'>
            <FaAngleDoubleLeft /> First
          </button>

          <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='btn btnWrapper'>
            <FaAngleLeft /> Prev
          </button>

          {getPageNumbers().map(num => (
            <button key={num} onClick={() => goToPage(num)} className={`btn cstmbtn ${num === page ? 'activePage' : ''}`}>
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
