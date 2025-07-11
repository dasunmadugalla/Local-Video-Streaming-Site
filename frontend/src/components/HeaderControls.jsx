// ../components/HeaderControls.jsx
import React from 'react';
import { FaPlus, FaSearch } from 'react-icons/fa';

const HeaderControls = ({ onCategoryClick, sortBy, setSortBy, order, setOrder }) => (
  <div className="header">
    <button className="category btn classic btnWrapper" onClick={onCategoryClick}>
      <FaPlus /> Category
    </button>
    <div className="search">
      <input type="text" className='searchBar' placeholder='Search Here' />
      <button type="submit" className='submitBtn'><FaSearch /></button>
    </div>
    <div className="sortWrapper">
      <select className='btn classic sortBtn' value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="title">Title</option>
        <option value="size">File Size</option>
        <option value="fileName">File Name</option>
      </select>
      <select className='btn classic formatBtn' value={order} onChange={e => setOrder(e.target.value)}>
        <option value="ascending">Assending</option>
        <option value="descending">Dessending</option>
      </select>
    </div>
  </div>
);

export default HeaderControls;
