import React, { useEffect, useState, useContext, useCallback, useMemo } from 'react';
import VideoPreview from '../components/VideoPreview';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { FileContext } from '../components/FileContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import TagModal from '../components/TagModal';
import '../styling/VideoGrid.css';
import { API_BASE } from '../utils/api';

const LOAD_COUNT = 18;
const MOBILE_PAGINATION_BREAKPOINT = 768;

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
    setHasFetched,
    shuffledCache, setShuffledCache
  } = useContext(FileContext);

  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState({ message: '', type: '' });
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [tagCategories, setTagCategories] = useState({});
  const [tagInputs, setTagInputs] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectionAnchor, setSelectionAnchor] = useState(null);
  const [isBulkTagEdit, setIsBulkTagEdit] = useState(false);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState({});
  const [bulkInitialCommonTags, setBulkInitialCommonTags] = useState({});
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(isHome ? 1 : pageParam);
  const [isMobilePagination, setIsMobilePagination] = useState(() => (
    typeof window !== 'undefined' && window.innerWidth <= MOBILE_PAGINATION_BREAKPOINT
  ));

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
    setIsBulkTagEdit(false);
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


  const getCommonTags = useCallback((detailsList) => {
    const common = {};
    Object.keys(tagCategories).forEach((cat) => {
      const categoryLists = detailsList.map((detail) => {
        const tags = detail.tags && Array.isArray(detail.tags[cat]) ? detail.tags[cat] : [];
        return Array.from(new Set(tags));
      });

      if (categoryLists.length === 0) {
        common[cat] = [];
        return;
      }

      const base = categoryLists[0] || [];
      common[cat] = base.filter(tag => categoryLists.every(list => list.includes(tag)));
    });

    return common;
  }, [tagCategories]);

  const openBulkTagModal = useCallback(async () => {
    if (!isHome || selectedFiles.length === 0) return;

    try {
      const detailsEntries = await Promise.all(
        selectedFiles.map(async (fileName) => {
          const res = await fetch(`${API_BASE}/api/videoDetails?fileName=${encodeURIComponent(fileName)}`);
          const data = await res.json();
          return [fileName, { title: data.title || '', tags: data.tags || {} }];
        })
      );

      const detailsMap = Object.fromEntries(detailsEntries);
      const detailsList = Object.values(detailsMap);
      const commonTags = getCommonTags(detailsList);

      setSelectedVideoDetails(detailsMap);
      setBulkInitialCommonTags(commonTags);
      setTagInputs(commonTags);
      setTitleInput('');
      setIsBulkTagEdit(true);
      setShowTitleModal(true);
    } catch (err) {
      console.error('Failed to load selected video details', err);
      setPopup({ message: 'Failed to load selected videos', type: 'error' });
    }
  }, [getCommonTags, isHome, selectedFiles]);

  const buildTagPayloadFromInputs = () => {
    const tags = {};
    Object.entries(tagInputs).forEach(([cat, arr]) => {
      if (Array.isArray(arr) && arr.length) tags[cat] = arr;
    });
    return tags;
  };

  const handleSingleVideoSave = () => {
    const tags = buildTagPayloadFromInputs();

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

  const handleBulkTagSave = async () => {
    const commonFinalTags = buildTagPayloadFromInputs();

    try {
      const results = await Promise.all(selectedFiles.map(async (fileName) => {
        const detail = selectedVideoDetails[fileName] || { title: '', tags: {} };
        const nextTags = { ...(detail.tags || {}) };

        Object.keys(tagCategories).forEach((category) => {
          const existing = Array.isArray(nextTags[category]) ? nextTags[category] : [];
          const initialCommon = bulkInitialCommonTags[category] || [];
          const finalCommon = commonFinalTags[category] || [];

          const withoutOldCommon = existing.filter(tag => !initialCommon.includes(tag));
          const merged = Array.from(new Set([...withoutOldCommon, ...finalCommon]));

          if (merged.length) nextTags[category] = merged;
          else delete nextTags[category];
        });

        const res = await fetch(`${API_BASE}/api/updateVideo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, title: detail.title || '', tags: nextTags })
        });
        return res.json();
      }));

      const failed = results.some(result => !result || !result.success);
      if (failed) {
        setPopup({ message: 'Some videos failed to update', type: 'error' });
      } else {
        setPopup({ message: `${selectedFiles.length} videos updated successfully`, type: 'success' });
      }

      setShowTitleModal(false);
    } catch (err) {
      console.error('Bulk update failed', err);
      setPopup({ message: 'Failed to update selected videos', type: 'error' });
      setShowTitleModal(false);
    }
  };

  const handleTitleSave = () => {
    if (isBulkTagEdit) {
      handleBulkTagSave();
      return;
    }

    handleSingleVideoSave();
  };

  const removeTag = (category, index) => {
    const updated = (tagInputs[category] || []).filter((_, i) => i !== index);
    setTagInputs({ ...tagInputs, [category]: updated });
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
          try { setShuffledCache([]); } catch { /* ignore */ }
          fetchPage(page);
        }
      };
    } catch {
      // BroadcastChannel not available — no-op
      bc = null;
    }

    // Also listen for a custom DOM event fallback
    const handler = () => {
      try { setShuffledCache([]); } catch { /* ignore */ }
      fetchPage(page);
    };
    window.addEventListener('app_folders_changed', handler);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('app_folders_changed', handler);
    };
  }, [page, fetchPage, setShuffledCache]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_PAGINATION_BREAKPOINT}px)`);
    const updatePaginationMode = (event) => {
      setIsMobilePagination(event.matches);
    };

    setIsMobilePagination(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePaginationMode);
      return () => mediaQuery.removeEventListener('change', updatePaginationMode);
    }

    mediaQuery.addListener(updatePaginationMode);
    return () => mediaQuery.removeListener(updatePaginationMode);
  }, []);

  const totalPages = Math.max(1, Math.ceil((allCount || 0) / LOAD_COUNT));

  const getPageNumbers = () => {
    const pages = [];
    const maxDisplay = isMobilePagination ? 3 : 5;

    if (totalPages <= maxDisplay) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    const halfWindow = Math.floor(maxDisplay / 2);
    let start = page - halfWindow;
    let end = page + halfWindow;

    if (start < 1) {
      start = 1;
      end = maxDisplay;
    }

    if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxDisplay + 1;
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToPage = (newPage) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (newPage === 1) navigate('/');
    else navigate(`/videos?page=${newPage}`);
  };


  const fileIndexMap = useMemo(() => {
    const map = new Map();
    visibleFiles.forEach((file, idx) => map.set(file, idx));
    return map;
  }, [visibleFiles]);

  useEffect(() => {
    // keep selections scoped to currently visible files
    setSelectedFiles(prev => prev.filter(file => fileIndexMap.has(file)));
    if (selectionAnchor && !fileIndexMap.has(selectionAnchor)) {
      setSelectionAnchor(null);
    }
  }, [fileIndexMap, selectionAnchor]);

  const handleSelectionClick = (event, file) => {
    const isLeftClick = (event.nativeEvent?.button ?? 0) === 0;
    if (!isLeftClick) return;

    const isCtrlLike = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    if (!isCtrlLike && !isShift) return;

    event.preventDefault();
    event.stopPropagation();

    const currentIndex = fileIndexMap.get(file);
    if (typeof currentIndex !== 'number') return;

    if (isShift) {
      const anchorIndex = fileIndexMap.get(selectionAnchor);
      if (typeof anchorIndex === 'number') {
        const [start, end] = [anchorIndex, currentIndex].sort((a, b) => a - b);
        const range = visibleFiles.slice(start, end + 1);
        setSelectedFiles(prev => Array.from(new Set([...prev, ...range])));
      } else {
        setSelectedFiles([file]);
      }
      setSelectionAnchor(file);
      return;
    }

    if (isCtrlLike) {
      setSelectedFiles(prev => (
        prev.includes(file) ? prev.filter(item => item !== file) : [...prev, file]
      ));
      setSelectionAnchor(file);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.videoBoxWrapper')) return;

      setSelectedFiles([]);
      setSelectionAnchor(null);
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);

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
              isSelected={selectedFiles.includes(file)}
              onSelectClick={(e) => handleSelectionClick(e, file)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (selectedFiles.length > 0 && selectedFiles.includes(file)) {
                  openBulkTagModal();
                  return;
                }

                openTitleModal(file);
              }}
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
            showTitle={!isBulkTagEdit}
            modalTitle={isBulkTagEdit ? `Edit Common Genres (${selectedFiles.length} selected)` : ''}
          />
        )}

        <div style={{ textAlign: 'center', marginTop: '75px', display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => goToPage(1)} disabled={page === 1} className='pgArrBtn'>
            <FaAngleDoubleLeft /> 
          </button>

          <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='pgArrBtn'>
            <FaAngleLeft /> 
          </button>

          {getPageNumbers().map(num => (
            <button key={num} onClick={() => goToPage(num)} className={`pgbtn pgnmbBtn ${num === page ? 'activePage' : ''}`}>
              {num}
            </button>
          ))}

          <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className='pgArrBtn'>
             <FaAngleRight />
          </button>

          <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className='pgArrBtn'>
             <FaAngleDoubleRight />
          </button>
        </div>
      </div>
    </>
  );
};

export default FileList;
