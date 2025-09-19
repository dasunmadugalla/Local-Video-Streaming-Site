import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import FileList from './pages/FileList';
import VideoPlayer from './pages/VideoPlayer';
import PageNotFount from './pages/PageNotFount';
import { FileProvider } from './components/FileContext';
import logo from './assets/BlackedRaw.jpg';
import { FaUserCircle, FaCircle } from 'react-icons/fa';
import Settings from './pages/Settings';
import LibraryManager from './pages/LibraryManager';
import Access from './pages/Access';
import { API_BASE } from './utils/api'; // <- use API_BASE helper

// Helper to read session cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

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

  // Initialize logged-in state from session cookie
  const [isLoggedIn, setIsLoggedIn] = useState(
    getCookie('sessionToken') === 'true'
  );

  const location = useLocation();
  const navigate = useNavigate();
  const hideNav = location.pathname === "/access";

  // Redirect to /access if not logged in — pass original URL in state.from
  useEffect(() => {
    if (!isLoggedIn && location.pathname !== "/access") {
      const fullFrom = location.pathname + location.search + location.hash;
      navigate('/access', { state: { from: fullFrom } });
    }
  }, [isLoggedIn, location.pathname, location.search, location.hash, navigate]);

  // BroadcastChannel: listen for login/logout from other tabs
  useEffect(() => {
    const channel = new BroadcastChannel('auth_channel');
    channel.onmessage = (e) => {
      if (e.data === 'login') {
        setIsLoggedIn(true);
      } else if (e.data === 'logout') {
        setIsLoggedIn(false);
      }
    };
    return () => channel.close();
  }, []);

  // Expose a safe global login function that sets cookie + broadcasts
  useEffect(() => {
    window.setLogin = () => {
      document.cookie = 'sessionToken=true; path=/';
      setIsLoggedIn(true);
      const bc = new BroadcastChannel('auth_channel');
      bc.postMessage('login');
      bc.close();
    };

    window.setLogout = () => {
      document.cookie = 'sessionToken=; Max-Age=0; path=/';
      setIsLoggedIn(false);
      const bc = new BroadcastChannel('auth_channel');
      bc.postMessage('logout');
      bc.close();
      try { navigate('/access'); } catch (e) {}
    };
  }, [navigate]);

  // DB existence check with sessionStorage cache
  useEffect(() => {
    const cachedPri = sessionStorage.getItem("presentPri");

    if (cachedPri !== null) {
      setPresentPri(cachedPri === "true");
      return;
    }

    fetch(`${API_BASE}/api/check-db`)
      .then(res => res.json())
      .then(data => {
        if (data.exists) {
          setPresentPri(true);
          sessionStorage.setItem("presentPri", "true");

          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 4000);
        } else {
          setPresentPri(false);
          sessionStorage.setItem("presentPri", "false");
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
