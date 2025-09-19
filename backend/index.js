// ======== Express Backend (server.js) ==========
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const createPrimaryDBHandler = require('./primaryDb/dbHandler');

const app = express();
const port = 3000;
const PASSCODE = "197944";

app.use(cors());
app.use(express.json());

//const videoDirectory = "C:\\Users\\dasun\\Downloads\\collection";
//const videoDirectory = "C:\\Users\\dasun\\Downloads";
//const videoDirectory = "L:\\program";
//const videoDirectory = "L:\\ivy tega\\New folder\\checked";
//const videoDirectory = "L:\\ivy tega\\New folder";
//const videoDirectory = "F:\\xx";
const videoDirectory = "X:\\"
// const videoDirectory = "C:\\Users\\dasun\\Downloads\\Telegram Desktop"
//const videoDirectory = "E:\\lexer\\program"

app.use('/videos', express.static(videoDirectory));
app.use('/api', createPrimaryDBHandler(videoDirectory));


let shuffledCache = []; // Cache shuffled list

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
};

app.get('/files', (req, res) => {
  const { offset = 0, limit = 150, reshuffle = false } = req.query;
  const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];

  if (shuffledCache.length === 0 || reshuffle === 'true') {
    fs.readdir(videoDirectory, (err, files) => {
      if (err) return res.status(500).json({ error: 'Failed to read directory' });

      const filtered = files.filter(file =>
        videoExtensions.includes(path.extname(file).toLowerCase())
      );

      shuffledCache = filtered.slice();

      for (let i = shuffledCache.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledCache[i], shuffledCache[j]] = [shuffledCache[j], shuffledCache[i]];
      }

      sendPaginated(res, offset, limit, true);
    });
  } else {
    sendPaginated(res, offset, limit, false);
  }
});

const sendPaginated = (res, offset, limit, includeFullList) => {
  const paginated = shuffledCache.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  if (includeFullList) {
    res.json({
      total: shuffledCache.length,
      files: paginated,
      fullList: shuffledCache
    });
  } else {
    res.json({
      total: shuffledCache.length,
      files: paginated
    });
  }
};

app.get('/libraryfiles', (req, res) => {
  const { sortBy = 'fileName', order = 'ascending', offset = 0, limit = 50 } = req.query;
  const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];

  fs.readdir(videoDirectory, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read directory' });

    const filtered = files.filter(file =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    const detailedList = filtered.map(file => {
      const filePath = path.join(videoDirectory, file);
      let size = 0;

      try {
        const stats = fs.statSync(filePath);
        size = stats.size;
      } catch (err) {
        console.error(`Skipping corrupted file: ${file}`, err);
        return null;
      }

      return {
        fileName: file,
        size,
        formattedSize: formatFileSize(size)
      };
    }).filter(Boolean);

    detailedList.sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      if (sortBy === 'fileName') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
      }

      if (compareA < compareB) return order === 'ascending' ? -1 : 1;
      if (compareA > compareB) return order === 'ascending' ? 1 : -1;
      return 0;
    });

    const paginated = detailedList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    const totalSize = detailedList.reduce((sum, file) => sum + file.size, 0);

    res.json({
      total: detailedList.length,
      totalSize,
      files: paginated
    });
  });
});

app.get('/allfiles', (req, res) => {
  const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];

  fs.readdir(videoDirectory, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read directory' });

    const filtered = files.filter(file =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    res.json(filtered);
  });
});

app.post('/api/verify-passcode', (req, res) => {
  const { password } = req.body;

  if (password === PASSCODE) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: "Wrong password" });
  }
});


app.get('/random', (req, res) => {
  const { limit = 8 } = req.query;
  const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];

  fs.readdir(videoDirectory, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read directory' });

    const filtered = files.filter(file =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    const shuffled = filtered.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    res.json(shuffled.slice(0, parseInt(limit)));
  });
});

// app.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});