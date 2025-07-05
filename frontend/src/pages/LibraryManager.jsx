import React, { useEffect, useState } from 'react';
import { FaPlus, FaSearch, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';

function LibraryManager() {
  const [files, setFiles] = useState([]);
  const [sortBy, setSortBy] = useState('fileName');
  const [order, setOrder] = useState('ascending');
  const [total, setTotal] = useState(0);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

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
      })
      .catch(err => console.error('Error fetching files:', err));
  };

  useEffect(() => {
    setPage(pageParam);
  }, [pageParam, location.pathname]);

  useEffect(() => {
    fetchFiles();
  }, [sortBy, order, page]);

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
      <div className="header">
        <button className="category btn btnWrapper"><FaPlus /> Category</button>
        <div className="search">
          <input type="text" className='searchBar' placeholder='Search Here' />
          <button type="submit" className='submitBtn'><FaSearch /></button>
        </div>
        <div className="sortWrapper">
          <select name="sort" className='btn sortBtn' value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="title">Title</option>
            <option value="size">File Size</option>
            <option value="fileName">File Name</option>
          </select>
          <select name="format" className='btn formatBtn' value={order} onChange={e => setOrder(e.target.value)}>
            <option value="ascending">Assending</option>
            <option value="descending">Dessending</option>
          </select>
        </div>
      </div>

      <div id="videoContainer" className="videoContainer">
        <table className="fileTable">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr key={index}>
              <td title={file.fileName}>
                {file.fileName.length > 40 ? file.fileName.slice(0, 40) + '...' : file.fileName}
              </td>
                <td>{file.formattedSize}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button onClick={() => goToPage(1)} disabled={page === 1} className='btn btnWrapper'><FaAngleDoubleLeft /> First</button>
        <button onClick={() => goToPage(Math.max(page - 1, 1))} disabled={page === 1} className='btn btnWrapper'><FaAngleLeft /> Prev</button>

        {getPageNumbers().map(num => (
          <button key={num} onClick={() => goToPage(num)} className={`btn ${num === page ? 'activePage' : ''}`}>
            {num}
          </button>
        ))}

        <button onClick={() => goToPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} className='btn btnWrapper'>Next <FaAngleRight /></button>
        <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className='btn btnWrapper'>Last <FaAngleDoubleRight /></button>
      </div>
    </>
  );
}

export default LibraryManager;
