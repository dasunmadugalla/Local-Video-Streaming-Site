import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FileList from './pages/FileList';
import VideoPlayer from './pages/VideoPlayer';
import PageNotFount from './pages/PageNotFount';
import { FileProvider } from './components/FileContext';
import logo from './assets/BlackedRaw.jpg';
import { FaUserCircle } from 'react-icons/fa';

function App() {
  return (
    <FileProvider>
      <Router>
        <div className="navigationBar">
          <div className="right">
            <Link to="/">
              <img className='logo' src={logo} alt="logo" />          
            </Link>

            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/library">Library</Link></li>
              <li><Link to="/category">Category</Link></li>
            </ul>
          </div>

          <div className="left">
            <FaUserCircle className='profileIcon' />
          </div>
        </div>

        <Routes>
          <Route path="/" element={<FileList />} />
          <Route path="/watch/:fileName" element={<VideoPlayer />} />
          <Route path="*" element={<PageNotFount />} />
        </Routes>
      </Router>
    </FileProvider>
  );
}

export default App;
