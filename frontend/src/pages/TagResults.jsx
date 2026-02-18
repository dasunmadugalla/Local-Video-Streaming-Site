import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from 'react-icons/fa';
import VideoPreview from '../components/VideoPreview';
import '../styling/VideoGrid.css';
import { API_BASE } from '../utils/api';

const LOAD_COUNT = 15;

const TagResults = () => {
  const { tagName = '' } = useParams();
  const decodedTag = decodeURIComponent(tagName);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pageParam = parseInt(searchParams.get('page'), 10) || 1;
  const [page, setPage] = useState(pageParam);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPage(pageParam);
  }, [pageParam]);

  useEffect(() => {
    setLoading(true);
    const offset = (page - 1) * LOAD_COUNT;

    fetch(`${API_BASE}/tag/${encodeURIComponent(decodedTag)}?offset=${offset}&limit=${LOAD_COUNT}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.files || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Tag results failed:', err);
        setResults([]);
        setTotal(0);
        setLoading(false);
      });
  }, [decodedTag, page]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / LOAD_COUNT)), [total]);

  const getPageNumbers = () => {
    const pages = [];
    const maxDisplay = 5;
    let start = Math.max(page - 2, 1);
    let end = Math.min(start + maxDisplay - 1, totalPages);

    if (end - start < maxDisplay - 1) {
      start = Math.max(end - maxDisplay + 1, 1);
    }

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const goToPage = (newPage) => {
    navigate(`/tag/${encodeURIComponent(decodedTag)}?page=${newPage}`);
  };

  const startIndex = total === 0 ? 0 : (page - 1) * LOAD_COUNT + 1;
  const endIndex = Math.min(page * LOAD_COUNT, total);

  if (loading) {
    return (
      <div className="spinnerContainer">
        <div className="spinner"></div>
        <p>Loading tag videos...</p>
      </div>
    );
  }

  return (
    <div className="mainContainer">
      <div className="searchResult-label">
        <h2>
          Tag: <span className="query-text">"{decodedTag}"</span>
        </h2>

        <div className="searchResults-videoCount">
          {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total}` : 'No videos found'}
        </div>
      </div>

      <div className="subContainer">
        {results.length > 0 ? (
          results.map((file, idx) => (
            <VideoPreview key={`${file}-${idx}`} file={file} />
          ))
        ) : (
          <p>No videos found for this tag.</p>
        )}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => goToPage(1)} disabled={page === 1} className="pgArrBtn">
          <FaAngleDoubleLeft />
        </button>

        <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className="pgArrBtn">
          <FaAngleLeft />
        </button>

        {getPageNumbers().map((num) => (
          <button key={num} onClick={() => goToPage(num)} className={`pgbtn pgnmbBtn${num === page ? 'activePage' : ''}`}>
            {num}
          </button>
        ))}

        <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className="pgArrBtn">
          <FaAngleRight />
        </button>

        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="pgArrBtn">
          <FaAngleDoubleRight />
        </button>
      </div>
    </div>
  );
};

export default TagResults;
