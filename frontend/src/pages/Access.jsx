import React, { useState, useRef, useEffect } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styling/Access.css';

function Access() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // focus input behavior
  useEffect(() => {
    const input = inputRef.current;
    if (input) input.focus();

    const handleBlur = () => {
      setTimeout(() => input.focus(), 0);
    };

    input.addEventListener('blur', handleBlur);
    return () => input.removeEventListener('blur', handleBlur);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setPassword(val);
      setError('');
    } else {
      setError('Please enter numbers only');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // 1) set session cookie (no expires => session cookie)
          document.cookie = 'sessionToken=true; path=/';

          // 2) broadcast login to other open tabs
          try {
            const bc = new BroadcastChannel('auth_channel');
            bc.postMessage('login');
            bc.close();
          } catch (e) {
            // BroadcastChannel might not be available in very old browsers; ignore if fails
          }

          // 3) also call global setter if available (keeps React state in-sync)
          if (window.setLogin) window.setLogin();

          setError('');
          const redirectPath = location.state?.from || '/';
          navigate(redirectPath, { replace: true });
          return;
        } else {
          setError('Wrong password');
        }
      } else {
        setError('Wrong password');
      }
    } catch (err) {
      console.error("Error verifying passcode:", err);
      setError('Server error, try again later.');
    }

    // on failure: shake + reset
    setShake(true);
    setPassword('');
    setTimeout(() => setShake(false), 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="access-container">
      <h1 className='passcode-title'>Enter passcode to grant access</h1>
      <div className={`input-container ${shake ? 'shake' : ''}`}>
        <input
          ref={inputRef}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder="Enter Password"
          className="btn access-input"
        />
        <span
          onClick={() => setShowPassword(!showPassword)}
          className="eye-icon"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </span>
      </div>

      <div className="error-container">
        {error && <p className="error-text">{error}</p>}
      </div>
    </div>
  );
}

export default Access;
