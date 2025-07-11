import React, { useEffect, useState } from 'react';
import { FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import HeaderControls from '../components/HeaderControls';
import TagModal from '../components/TagModal';
import VideoGrid from '../components/VideoGrid';

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

  const pageParam = parseInt(searchParams.get('page')) || 1;
  const [page, setPage] = useState(pageParam);

  const LIMIT = 50;

  const fetchFiles = () => {
    const offset = (page - 1) * LIMIT;
    fetch(`http://localhost:3000/libraryfiles?sortBy=${sortBy}&order=${order}&offset=${offset}&limit=${LIMIT}`)
      .then(res => res.json())
      .then(data => {
        setFiles(data.files);
        setTotal(data.total);
        setTotalSize(data.totalSize);
      })
      .catch(err => console.error('Error fetching files:', err));
  };

  const fetchCategories = () => {
    fetch('http://localhost:3000/api/tagCategories')
      .then(res => res.json())
      .then(data => setTagCategories(data))
      .catch(err => console.error('Failed to load categories', err));
  };

  const addCategory = () => {
    if (!newCategory.trim()) return;
    fetch('http://localhost:3000/api/addCategory', {
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
    const initialTags = {};
    fetch(`http://localhost:3000/api/videoDetails?fileName=${encodeURIComponent(fileName)}`)
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

  const removeTag = (category, index) => {
    const updated = (tagInputs[category] || []).filter((_, i) => i !== index);
    setTagInputs({ ...tagInputs, [category]: updated });
  };

  const handleTitleSave = () => {
    const tags = {};
    Object.entries(tagInputs).forEach(([cat, arr]) => {
      if (Array.isArray(arr) && arr.length) tags[cat] = arr;
    });

    fetch('http://localhost:3000/api/updateVideo', {
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
        />
      )}

      <div className='libraryStats'>
        Total Videos: <strong>{total}</strong> | Total Size: <strong>{formatSize(totalSize)}</strong>
      </div>

      <VideoGrid
        files={files}
        tagCategories={tagCategories}
        openTitleModal={openTitleModal}
      />

      <div className="pagination">
        <button onClick={() => goToPage(1)} disabled={page === 1} className='btn classic btnWrapper'><FaAngleDoubleLeft /> First</button>
        <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='btn classic btnWrapper'><FaAngleLeft /> Prev</button>

        {getPageNumbers().map(num => (
          <button key={num} onClick={() => goToPage(num)} className={`btn classic ${num === page ? 'activePage' : ''}`}>
            {num}
          </button>
        ))}

        <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className='btn classic btnWrapper'>Next <FaAngleRight /></button>
        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className='btn classic btnWrapper'>Last <FaAngleDoubleRight /></button>
      </div>
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
