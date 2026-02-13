import React, { useState, useRef, useEffect } from 'react';
import { FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styling/Access.css';
import { API_BASE } from '../utils/api';

function Access() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // for dot jumping animation: index of last typed digit
  const [pulseIndex, setPulseIndex] = useState(-1);
  const pulseTimer = useRef<number | null>(null);

  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // focus input and re-focus after blur (so clicks on eye still work)
  useEffect(() => {
    const input = inputRef.current;
    if (input) input.focus();

    const handleBlur = () => {
      // allow other click handlers (like eye) to run then refocus
      setTimeout(() => input && input.focus(), 0);
    };

    if (input) input.addEventListener('blur', handleBlur);
    return () => input && input.removeEventListener('blur', handleBlur);
  }, []);

  const typing = password.length > 0;
  const DOTS = 6; // number of dots to show (classic 6-dot style)

  // doShake: force reflow to ensure shake animation restarts
  const doShake = () => {
    setShake(false);
    void (inputRef.current && (inputRef.current as any).offsetWidth);
    setShake(true);
    setTimeout(() => setShake(false), 650);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    // accept digits only
    if (/^\d*$/.test(val)) {
      // figure out the typed index for animation
      const oldLen = password.length;
      const newLen = val.length;

      setPassword(val);
      setError('');

      // if a new character was added, animate the newly added dot
      if (newLen > oldLen) {
        const newIndex = Math.min(newLen - 1, DOTS - 1);
        // clear existing timer
        if (pulseTimer.current) {
          clearTimeout(pulseTimer.current);
          pulseTimer.current = null;
        }
        // trigger pulse
        setPulseIndex(newIndex);
        pulseTimer.current = window.setTimeout(() => {
          setPulseIndex(-1);
          pulseTimer.current = null;
        }, 520); // slightly longer than animation to ensure full play
      }
    } else {
      setError('Please enter numbers only');
      doShake();
    }
  };

  const handleSubmit = async () => {
    if (loading) return; // prevent duplicate submits

    if (!password) {
      setError('Enter passcode');
      doShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/verify-passcode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // set a session cookie (session cookie: no expires)
          document.cookie = 'sessionToken=true; path=/';

          // broadcast login to other tabs
          try {
            const bc = new BroadcastChannel('auth_channel');
            bc.postMessage('login');
            bc.close();
          } catch (err) {
            // ignore older browsers
          }

          if (window.setLogin) window.setLogin();

          // success animation: force reflow so animation plays even if class already set
          setSuccess(false);
          void (inputRef.current && (inputRef.current as any).offsetWidth);
          setSuccess(true);

          setLoading(false);
          setError('');

          // wait briefly so user sees success animation, then navigate
          setTimeout(() => {
            const redirectPath = location.state?.from || '/';
            navigate(redirectPath, { replace: true });
          }, 700);

          return;
        } else {
          setError('Wrong password');
        }
      } else {
        setError('Wrong password');
      }
    } catch (err) {
      console.error('Error verifying passcode:', err);
      setError('Server error, try again later.');
    }

    // failure path
    setPassword('');
    doShake();
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div
      className={`access-container ${success ? 'success-state' : ''}`}
      aria-busy={loading}
    >
      <h1 className="passcode-title">Enter passcode to grant access</h1>

      <div className={`input-container ${shake ? 'shake' : ''}`}>
        <input
          ref={inputRef}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          placeholder="Enter Password"
          className={`access-input ${typing ? 'typing' : ''} ${success ? 'success' : ''}`}
          inputMode="numeric"
          aria-label="passcode"
          maxLength={DOTS}
          disabled={loading}
          pattern="\d*"
        />

        <button
          type="button"
          onClick={() => setShowPassword((s) => !s)}
          aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
          className={`eye-icon ${showPassword ? 'active' : ''}`}
          disabled={loading}
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>

        {/* Dot overlay: visual-only jumping dots. aria-hidden true so screen readers ignore them */}
        <div className="dot-overlay" aria-hidden="true">
          {Array.from({ length: DOTS }).map((_, i) => {
            const active = i < password.length;
            const jumping = i === pulseIndex;
            return (
              <span
                key={i}
                className={`dot ${active ? 'active' : ''} ${jumping ? 'jump' : ''}`}
                style={{ '--i': i } as React.CSSProperties}
              />
            );
          })}
        </div>
      </div>

      <div className="error-container" aria-live="polite">
        {error ? (
          <p className="error-text">{error}</p>
        ) : (
          <p className="error-text placeholder">&nbsp;</p>
        )}
      </div>

      <div className="controls">
        <button
          className="btn submit"
          onClick={handleSubmit}
          disabled={loading}
          aria-label="Unlock"
          aria-disabled={loading}
        >
          {loading ? (
            <>
              <FaSpinner className="spinner" aria-hidden="true" />
              <span className="btn-text"> Verifying</span>
            </>
          ) : (
            'Unlock'
          )}
        </button>
      </div>
    </div>
  );
}

export default Access;
