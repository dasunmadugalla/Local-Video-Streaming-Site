import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import FileList from './pages/FileList';
import VideoPlayer from './pages/VideoPlayer';
import PageNotFount from './pages/PageNotFount';
import { FileProvider } from './components/FileContext';
import logo from './assets/logo.png';
import { FaUserCircle, FaCircle,FaSearch } from 'react-icons/fa';
import Settings from './pages/Settings';
import LibraryManager from './pages/LibraryManager';
import Access from './pages/Access';
import SearchResults from './pages/SearchResults';
import { API_BASE } from './utils/api'; // keep using API_BASE

// Helper to read session cookie
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  // initialize from URL q if present
  const searchParams = new URLSearchParams(location.search);
  const qInit = searchParams.get('q') || '';

  const [query, setQuery] = useState(qInit);
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/tagCategories`)
      .then((res) => res.json())
      .then((data) => {
        const flattened = [];
        Object.entries(data || {}).forEach(([category, categoryTags]) => {
          Object.keys(categoryTags || {}).forEach((tag) => {
            flattened.push({ tag, category });
          });
        });
        setTagSuggestions(flattened);
      })
      .catch(() => setTagSuggestions([]));
  }, []);

  useEffect(() => {
    // update query if user navigates (keeps input in sync)
    const params = new URLSearchParams(location.search);
    const qp = params.get('q') || '';
    setQuery(qp);
  }, [location.search]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!searchContainerRef.current?.contains(event.target)) {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const trimmed = (query || '').trim().toLowerCase();
    if (!trimmed) return [];

    return tagSuggestions
      .filter(({ tag }) => tag.toLowerCase().includes(trimmed))
      .slice(0, 10);
  }, [query, tagSuggestions]);

  const goToSearch = (value) => {
    const trimmed = (value || '').trim();
    const url = trimmed ? `/search?q=${encodeURIComponent(trimmed)}&page=1` : `/search?page=1`;
    navigate(url);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (activeSuggestionIndex >= 0 && filteredSuggestions[activeSuggestionIndex]) {
      const selectedTag = filteredSuggestions[activeSuggestionIndex].tag;
      setQuery(selectedTag);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      goToSearch(selectedTag);
      return;
    }

    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    goToSearch(query);
  };

  // determine active link classes using pathname (keeps paginated /videos active)
  const pathname = location.pathname || '/';
  const isHomeActive = pathname === '/' || pathname.startsWith('/videos');
  const isLibraryActive = pathname.startsWith('/library');
  const isCategoryActive = pathname.startsWith('/category');
  const isSettingsActive = pathname.startsWith('/settings');

  const navLinkClass = (active) => `navLink${active ? ' active' : ''}`;

  return (
    <div className="navigationBar">
      <div className="right">
        <Link to="/">
          <img className="logo" src={logo} alt="logo" />
        </Link>

        <ul>
          <li><Link to="/" className={navLinkClass(isHomeActive)}>Home</Link></li>
          <li><Link to="/library" className={navLinkClass(isLibraryActive)}>Library</Link></li>
          {/* <li><Link to="/category" className={navLinkClass(isCategoryActive)}>Category</Link></li> */}
          <li><Link to="/settings" className={navLinkClass(isSettingsActive)}>Settings</Link></li>
        </ul>
      </div>

      <div className="center">
        {/* Search form */}
        <form onSubmit={submitSearch} className='searchBar-form' ref={searchContainerRef}>
          <input
            type="search"
            placeholder="Search videos..."
            value={query}
            className='search-input'
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
              setActiveSuggestionIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (!filteredSuggestions.length) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setShowSuggestions(true);
                setActiveSuggestionIndex((prev) => {
                  const next = prev + 1;
                  return next >= filteredSuggestions.length ? 0 : next;
                });
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setShowSuggestions(true);
                setActiveSuggestionIndex((prev) => {
                  if (prev <= 0) return filteredSuggestions.length - 1;
                  return prev - 1;
                });
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
              }
            }}
            aria-label="Search videos"
            spellCheck="false"
            autoComplete="off"
          />
          <button type="submit" className="searchBtn"><FaSearch /></button>

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="search-suggestions" role="listbox" aria-label="Tag suggestions">
              {filteredSuggestions.map((item, index) => (
                <button
                  type="button"
                  key={`${item.category}-${item.tag}-${index}`}
                  className={`search-suggestion-item${activeSuggestionIndex === index ? ' active' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setQuery(item.tag);
                    setShowSuggestions(false);
                    setActiveSuggestionIndex(-1);
                    goToSearch(item.tag);
                  }}
                >
                  <span className="search-suggestion-tag">{item.tag}</span>
                  <span className="search-suggestion-category">{item.category}</span>
                </button>
              ))}
            </div>
          )}
        </form>
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
        <Route path="/search" element={<SearchResults />} />
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
