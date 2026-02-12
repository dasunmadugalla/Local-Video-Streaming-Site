import React, { useEffect, useState } from 'react';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa';

const BOTTOM_THRESHOLD = 40;

function ScrollToggleButton() {
  const [isAtBottom, setIsAtBottom] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const atBottom = scrollTop + viewportHeight >= fullHeight - BOTTOM_THRESHOLD;
      setIsAtBottom(atBottom);
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: isAtBottom ? 0 : document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  return (
    <button
      type="button"
      className="scroll-toggle-btn"
      onClick={handleClick}
      aria-label={isAtBottom ? 'Scroll to top' : 'Scroll to bottom'}
      title={isAtBottom ? 'Go to top' : 'Go to bottom'}
    >
      {isAtBottom ? <FaArrowUp /> : <FaArrowDown />}
    </button>
  );
}

export default ScrollToggleButton;
