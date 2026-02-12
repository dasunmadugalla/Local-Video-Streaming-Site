import React, { useEffect, useRef, useState } from 'react';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import HeaderControls from '../components/HeaderControls';
import TagModal from '../components/TagModal';
import VideoGrid from '../components/VideoGrid';
import ScrollToggleButton from '../components/ScrollToggleButton';
import { API_BASE } from '../utils/api';

function LibraryManager() {
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState('fileName');
  const [order, setOrder] = useState('ascending');
  const [total, setTotal] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [showCategoryBox, setShowCategoryBox] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [popup, setPopup] = useState({ message: '', type: '' });

  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [tagCategories, setTagCategories] = useState({});
  const [tagInputs, setTagInputs] = useState({});

  const [selectedHashes, setSelectedHashes] = useState([]);

  const [isBulkTagEdit, setIsBulkTagEdit] = useState(false);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState({});
  const [bulkInitialCommonTags, setBulkInitialCommonTags] = useState({});
  const videoGridRef = useRef(null);

  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(pageParam);

  const LIMIT = 50;

  const fetchFiles = () => {
    const offset = (page - 1) * LIMIT;
    fetch(`${API_BASE}/libraryfiles?sortBy=${sortBy}&order=${order}&offset=${offset}&limit=${LIMIT}`)
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setTotal(data.total);
        setTotalSize(data.totalSize);
      })
      .catch(err => console.error('Error fetching files:', err));
  };

  const fetchCategories = () => {
    fetch(`${API_BASE}/api/tagCategories`)
      .then(res => res.json())
      .then(data => setTagCategories(data))
      .catch(err => console.error('Failed to load categories', err));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    fetch(`${API_BASE}/api/addCategory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: newCategory.trim() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPopup({ message: 'Category added successfully', type: 'success' });
          setNewCategory('');
          setShowCategoryBox(false);
          fetchCategories();
        } else if (data.error === 'Category already exists') {
          setPopup({ message: 'Category already exists', type: 'warning' });
        } else {
          setPopup({ message: data.error || 'Failed to add category', type: 'error' });
        }
      })
      .catch(err => {
        console.error('Error:', err);
        setPopup({ message: 'Failed to add category', type: 'error' });
      });
  };

  const openTitleModal = (fileName) => {
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
  };

  const getCommonTags = (detailsList) => {
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
  };

  const openBulkTagModal = async () => {
    if (selectedHashes.length === 0) {
      setPopup({ message: 'Select videos first, then right-click a selected row.', type: 'warning' });
      return;
    }

    try {
      const detailsEntries = await Promise.all(
        selectedHashes.map(async (fileName) => {
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
  };

  const removeTag = (category, index) => {
    const updated = (tagInputs[category] || []).filter((_, i) => i !== index);
    setTagInputs({ ...tagInputs, [category]: updated });
  };

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
          fetchFiles();
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
      const results = await Promise.all(selectedHashes.map(async (fileName) => {
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
        setPopup({ message: `${selectedHashes.length} videos updated successfully`, type: 'success' });
      }

      fetchFiles();
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

  useEffect(() => {
    setPage(pageParam);
  }, [pageParam, location.pathname]);

  useEffect(() => {
    fetchFiles();
    fetchCategories();
  }, [sortBy, order, page]);

  useEffect(() => {
    if (popup.message) {
      const timer = setTimeout(() => setPopup({ message: '', type: '' }), 2500);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (selectedHashes.length === 0) return;
      if (!videoGridRef.current?.contains(event.target)) {
        setSelectedHashes([]);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [selectedHashes]);

  const totalPages = Math.ceil(total / LIMIT);

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
    if (newPage <= 1) {
      navigate('/library');
    } else {
      navigate(`/library?page=${newPage}`);
    }
  };

  return (
    <>
      <HeaderControls
        onCategoryClick={() => setShowCategoryBox(true)}
        sortBy={sortBy}
        setSortBy={setSortBy}
        order={order}
        setOrder={setOrder}
      />

      {showCategoryBox && (
        <div className="categoryModal">
          <input
            type="text"
            placeholder="Enter Category Name"
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
          />
          <div className="buttons">
            <button className='btn classic cancel' onClick={() => setShowCategoryBox(false)}>Cancel</button>
            <button className='btn submit' onClick={addCategory}>Add</button>
          </div>
        </div>
      )}

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
          modalTitle={isBulkTagEdit ? `Edit Common Genres (${selectedHashes.length} selected)` : ''}
        />
      )}

      <div className='libraryStats'>
        Total Videos: <strong>{total}</strong> | Total Size: <strong>{formatSize(totalSize)}</strong>
      </div>

      <div ref={videoGridRef}>
        <VideoGrid
          files={files}
          tagCategories={tagCategories}
          openTitleModal={openTitleModal}
          selectMode={true}
          selectedHashes={selectedHashes}
          setSelectedHashes={setSelectedHashes}
          onSelectedRightClick={openBulkTagModal}
        />
      </div>

      <div className="pagination">
        <button onClick={() => goToPage(1)} disabled={page === 1} className='pgArrBtn'><FaAngleDoubleLeft /> First</button>
        <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='pgArrBtn'><FaAngleLeft /> Prev</button>

        {getPageNumbers().map(num => (
          <button key={num} onClick={() => goToPage(num)} className={`pgbtn pgnmbBtn${num === page ? 'activePage' : ''}`}>
            {num}
          </button>
        ))}

        <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className='pgArrBtn'>Next <FaAngleRight /></button>
        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className='pgArrBtn'>Last <FaAngleDoubleRight /></button>
      </div>

      <ScrollToggleButton />
    </>
  );
}

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

export default LibraryManager;
