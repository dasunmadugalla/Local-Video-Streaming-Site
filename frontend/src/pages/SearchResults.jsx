// src/pages/SearchResults.jsx
import React, { useEffect, useState, useCallback } from "react";
import VideoPreview from "../components/VideoPreview";
import {
  FaAngleLeft,
  FaAngleRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight
} from "react-icons/fa";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import TagModal from "../components/TagModal";
import "../styling/VideoGrid.css";
import { API_BASE } from "../utils/api";

const LOAD_COUNT = 15;

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const query = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page")) || 1;
  const [page, setPage] = useState(pageParam);

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [popup, setPopup] = useState({ message: "", type: "" });
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [tagCategories, setTagCategories] = useState({});
  const [tagInputs, setTagInputs] = useState({});

  // Fetch a page of search results
  const fetchPage = (p, q) => {
    setLoading(true);
    const offset = (p - 1) * LOAD_COUNT;
    const qpart = q ? `q=${encodeURIComponent(q)}&` : "";
    fetch(`${API_BASE}/search?${qpart}offset=${offset}&limit=${LOAD_COUNT}`)
      .then((res) => res.json())
      .then((data) => {
        setResults(data.files || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Search failed:", err);
        setResults([]);
        setTotal(0);
        setLoading(false);
      });
  };

  // Keep local page state in sync with URL param
  useEffect(() => {
    setPage(pageParam);
  }, [pageParam, location.search, location.pathname]);

  // Re-fetch whenever query or page changes
  useEffect(() => {
    fetchPage(page, query);
  }, [page, query]);

  const fetchCategories = useCallback(() => {
    fetch(`${API_BASE}/api/tagCategories`)
      .then((res) => res.json())
      .then((data) => setTagCategories(data || {}))
      .catch((err) => console.error("Failed to load categories", err));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openTitleModal = useCallback((fileName) => {
    setSelectedFile(fileName);
    setTitleInput("");
    const initialTags = {};

    fetch(`${API_BASE}/api/videoDetails?fileName=${encodeURIComponent(fileName)}`)
      .then((res) => res.json())
      .then((data) => {
        setTitleInput(data.title || "");
        Object.keys(tagCategories).forEach((cat) => {
          initialTags[cat] = (data.tags && data.tags[cat]) ? data.tags[cat] : [];
        });
        setTagInputs(initialTags);
        setShowTitleModal(true);
      })
      .catch((err) => console.error("Failed to load video details", err));
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: selectedFile, title: titleInput.trim(), tags })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPopup({ message: "Video updated successfully", type: "success" });
        } else {
          setPopup({ message: "Failed to update video", type: "error" });
        }
        setShowTitleModal(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        setPopup({ message: "Failed to update video", type: "error" });
        setShowTitleModal(false);
      });
  };

  useEffect(() => {
    if (popup.message) {
      const timer = setTimeout(() => setPopup({ message: "", type: "" }), 2500);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  const totalPages = Math.max(1, Math.ceil(total / LOAD_COUNT));

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
    // Preserve q if present, otherwise only page param
    const qpart = query ? `?q=${encodeURIComponent(query)}&page=${newPage}` : `?page=${newPage}`;
    navigate(`/search${qpart}`);
  };

  const startIndex = total === 0 ? 0 : (page - 1) * LOAD_COUNT + 1;
  const endIndex = Math.min(page * LOAD_COUNT, total);

  if (loading) {
    return (
      <div className="spinnerContainer">
        <div className="spinner"></div>
        <p>Searching videos...</p>
      </div>
    );
  }

  return (
    <div className="mainContainer">
      <div className="searchResult-label">
        <h2>
            {query ? (
              <>Search results for: <span className="query-text">"{query}"</span></>
            ) : (
              "All videos"
            )}
        </h2>



      <div className="searchResults-videoCount">
        {total > 0 ? `Showing ${startIndex}–${endIndex} of ${total}` : "No results found"}
        
        {/* <div style={{ color: "var(--progress_grey)", fontSize: 13 }}>
          {total} result{total === 1 ? "" : "s"}
        </div> */}
      </div>
      </div>

      <div className="subContainer">
        {results.length > 0 ? (
          results.map((file, idx) => (
            <VideoPreview
              key={idx}
              file={file}
              onContextMenu={(e) => {
                e.preventDefault();
                openTitleModal(file);
              }}
            />
          ))
        ) : (
          <p>No videos found.</p>
        )}
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

      <div style={{ textAlign: "center", marginTop: "20px", display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
        <button onClick={() => goToPage(1)} disabled={page === 1} className="btn btnWrapper">
          <FaAngleDoubleLeft /> First
        </button>

        <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className="btn btnWrapper">
          <FaAngleLeft /> Prev
        </button>

        {getPageNumbers().map((num) => (
          <button key={num} onClick={() => goToPage(num)} className={`btn cstmbtn ${num === page ? "activePage" : ""}`}>
            {num}
          </button>
        ))}

        <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className="btn btnWrapper">
          Next <FaAngleRight />
        </button>

        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="btn btnWrapper">
          Last <FaAngleDoubleRight />
        </button>
      </div>
    </div>
  );
};

export default SearchResults;
