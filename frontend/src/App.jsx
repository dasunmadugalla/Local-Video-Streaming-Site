import { React,useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FileList from './pages/FileList';
import VideoPlayer from './pages/VideoPlayer';
import PageNotFount from './pages/PageNotFount';
import { FileProvider } from './components/FileContext';
import logo from './assets/BlackedRaw.jpg';
import { FaUserCircle } from 'react-icons/fa';
import Settings from './pages/Settings';
import LibraryManager from './pages/LibraryManager';

function App() {
  const [presentPri,setPresentPri] = useState(undefined)
  useEffect(() => {
  fetch('http://localhost:3000/api/check-db')
    .then(res => res.json())
    .then(data => {
      if (data.exists) {
        console.log('DB exists!');
        setPresentPri(true)
      } else {
        console.log('DB not found!');
        setPresentPri(false)
      }
    })
    .catch(err => console.error('Error:', err));
}, []);

  return (
    <FileProvider>
      <Router>
        <div className="navigationBar">
          {presentPri ? 'we are having it' : 'it is gone'}
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
          <Route path="/" element={<FileList isHome={true} />} />
          <Route path="/videos" element={<FileList isHome={false} />} />
          <Route path="/watch/:fileName" element={<VideoPlayer />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/library" element={<LibraryManager />} />
          <Route path="*" element={<PageNotFount />} />
        </Routes>
      </Router>
    </FileProvider>
  );
}

export default App;
