import { createContext, useState } from 'react';

export const FileContext = createContext();

export const FileProvider = ({ children }) => {
  const [allCount, setAllCount] = useState(0);
  const [visibleFiles, setVisibleFiles] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  // ✅ New: Global cache for reshuffled list
  const [shuffledCache, setShuffledCache] = useState([]);

  return (
    <FileContext.Provider value={{
      allCount, setAllCount,
      visibleFiles, setVisibleFiles,
      hasFetched, setHasFetched,
      shuffledCache, setShuffledCache
    }}>
      {children}
    </FileContext.Provider>
  );
};
