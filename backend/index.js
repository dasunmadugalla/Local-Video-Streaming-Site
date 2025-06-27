// ======== Express Backend (server.js) ==========
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());
// const videoDirectory = "C:\\Users\\dasun\\Downloads\\collection";
//const videoDirectory = "C:\\Users\\dasun\\Downloads";
//const videoDirectory = "L:\\program";
const videoDirectory = "L:\\ivy tega\\New folder";

app.use('/videos', express.static(videoDirectory));

app.get('/files', (req, res) => {
  const { offset = 0, limit = 150 } = req.query;
  const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];

  fs.readdir(videoDirectory, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read directory' });

    const filtered = files.filter(file =>
      videoExtensions.includes(path.extname(file).toLowerCase())
    );

    // 🔥 Shuffle array using Fisher-Yates
    const shuffled = filtered.slice(); // Copy array
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const paginated = shuffled.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    res.json({ total: filtered.length, files: paginated });
  });
});

// 🔥 Full file list for random suggestions (no shuffle, pure list)
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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
