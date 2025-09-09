// SearchResults.js
import React, { useEffect, useState } from "react";
import VideoPreview from "../components/VideoPreview";
import { useSearchParams } from "react-router-dom";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (query.trim()) {
      fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setResults(data))
        .catch((err) => console.error("Search failed:", err));
    }
  }, [query]);

  return (
    <div className="mainContainer">
      <h2>Search results for: {query}</h2>
      <div className="subContainer">
        {results.length > 0 ? (
          results.map((file, idx) => <VideoPreview key={idx} file={file} />)
        ) : (
          <p>No videos found.</p>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
