import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import FileList from './pages/FileList';
import VideoPlayer from './pages/VideoPlayer';
import PageNotFount from './pages/PageNotFount';
import { FileProvider } from './components/FileContext';
import logo from './assets/BlackedRaw.jpg';
import { FaUserCircle, FaCircle } from 'react-icons/fa';
import Settings from './pages/Settings';
import LibraryManager from './pages/LibraryManager';
import Access from './pages/Access';

// NavigationBar component separated for clarity
function NavigationBar() {
  return (
    <div className="navigationBar">
      <div className="right">
        <Link to="/">
          <img className="logo" src={logo} alt="logo" />
        </Link>

        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/about">About</Link></li>
          <li><Link to="/library">Library</Link></li>
          <li><Link to="/category">Category</Link></li>
        </ul>
      </div>

      <div className="left">
        <FaUserCircle className="profileIcon" />
      </div>
    </div>
  );
}

function AppContent() {
  const [presentPri, setPresentPri] = useState(undefined);
  const [showNotification, setShowNotification] = useState(false);
  const location = useLocation();

  // Hide nav bar only on Access page
  const hideNav = location.pathname === "/access";

  useEffect(() => {
    fetch('http://localhost:3000/api/check-db')
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          console.log('DB exists!');
          setPresentPri(true);
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 4000);
        } else {
          console.log('DB not found!');
          setPresentPri(false);
        }
      })
      .catch(err => console.error('Error:', err));
  }, []);

  return (
    <>
      {!hideNav && <NavigationBar />}

      {showNotification && (
        <div className="toast-notification">
          <FaCircle className="indicateCircle" /> Primary Database is Available
        </div>
      )}

      <Routes>
        <Route path="/" element={<FileList isHome={true} />} />
        <Route path="/videos" element={<FileList isHome={false} />} />
        <Route path="/watch/:fileName" element={<VideoPlayer />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/library" element={<LibraryManager />} />
        <Route path="/access" element={<Access />} />
        <Route path="*" element={<PageNotFount />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <FileProvider>
      <Router>
        <AppContent />
      </Router>
    </FileProvider>
  );
}

export default App;
