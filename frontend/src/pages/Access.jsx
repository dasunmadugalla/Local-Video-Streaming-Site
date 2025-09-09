import React, { useState, useRef, useEffect } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styling/Access.css';

function Access() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

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
        console.log("✅ Access granted:", data);
        setError('');
        // 👉 redirect to main page or unlock content
        alert("Access granted!");
      } else {
        setError('Wrong password');
        setShake(true);
        setPassword('');
        setTimeout(() => setShake(false), 600);
      }
    } catch (err) {
      console.error("Error verifying passcode:", err);
      setError('Server error, try again later.');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="access-container">
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
