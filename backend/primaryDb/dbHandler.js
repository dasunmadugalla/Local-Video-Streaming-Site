// primaryDb/dbHandler.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createRouter(videoDirectoryOrResolver) {
  const router = express.Router();
  const dbPath = path.join(__dirname, './db.json');

  // helper: resolve encoded fileName -> absolute path
  const isResolverFunction = typeof videoDirectoryOrResolver === 'function';
  function resolveFilePath(encodedNameOrFileName) {
    if (!encodedNameOrFileName) return null;
    if (isResolverFunction) {
      // expected to return null or absolute path
      try {
        return videoDirectoryOrResolver(encodedNameOrFileName);
      } catch (e) {
        return null;
      }
    } else {
      // previous behavior: treat input as plain fileName and join with single videoDirectory
      return path.join(videoDirectoryOrResolver, encodedNameOrFileName);
    }
  }

  router.get('/check-db', (req, res) => {
    if (fs.existsSync(dbPath)) {
      res.json({ exists: true });
    } else {
      fs.writeFileSync(dbPath, JSON.stringify({ videos: {}, tagCategories: {}, playlists: {}, fileDetails: {} }, null, 2), 'utf8');
      res.json({ exists: false });
    }
  });

  router.post('/addCategory', (req, res) => {
    const { categoryName } = req.body;
    if (!categoryName || typeof categoryName !== 'string') return res.status(400).json({ error: 'Invalid category name' });

    let db = readDB();
    if (db.tagCategories[categoryName]) return res.status(400).json({ error: 'Category already exists' });

    db.tagCategories[categoryName] = {};
    writeDB(db);
    res.json({ success: true });
  });

  router.get('/tagCategories', (req, res) => {
    const db = readDB();
    res.json(db.tagCategories || {});
  });

  router.get('/videoDetails', async (req, res) => {
    const { fileName } = req.query;
    if (!fileName) return res.status(400).json({ error: 'Missing fileName' });

    const filePath = resolveFilePath(fileName);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const db = readDB();
    const hash = await generateFileHash(filePath);

    if (!db.videos[hash]) return res.json({ title: '', tags: {} });

    res.json({
      title: db.videos[hash].title || '',
      tags: db.videos[hash].tags || {}
    });
  });

  router.post('/updateTitle', async (req, res) => {
    const { fileName, title } = req.body;
    if (!fileName || typeof title !== 'string') return res.status(400).json({ error: 'Missing data' });

    const filePath = resolveFilePath(fileName);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const db = readDB();
    const hash = await generateFileHash(filePath);

    if (!db.videos[hash]) db.videos[hash] = { fileName, tags: {} };

    db.videos[hash].title = title;
    writeDB(db);

    res.json({ success: true });
  });

  router.post('/updateVideo', async (req, res) => {
    const { fileName, title, tags } = req.body;
    if (!fileName) return res.status(400).json({ error: 'Missing fileName' });

    const filePath = resolveFilePath(fileName);
    if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const db = readDB();
    const hash = await generateFileHash(filePath);

    if (!db.videos[hash]) db.videos[hash] = { fileName, tags: {} };
    
    // Store old tags for cleanup
    const oldTags = db.videos[hash].tags || {};

    db.videos[hash].title = title || '';
    db.videos[hash].tags = tags || {};

    // Cleanup: Remove video hash from tags that no longer exist
    Object.entries(oldTags).forEach(([category, tagList]) => {
      if (!db.tagCategories[category]) return;

      tagList.forEach(tag => {
        if (db.tagCategories[category][tag]) {
          db.tagCategories[category][tag] = db.tagCategories[category][tag].filter(h => h !== hash);
          if (db.tagCategories[category][tag].length === 0) {
            delete db.tagCategories[category][tag];
          }
        }
      });
    });

    // Add new tags
    if (tags && typeof tags === 'object') {
      Object.entries(tags).forEach(([category, tagList]) => {
        if (!Array.isArray(tagList)) return;

        if (!db.tagCategories[category]) db.tagCategories[category] = {};

        tagList.forEach(tag => {
          if (!db.tagCategories[category][tag]) db.tagCategories[category][tag] = [];
          if (!db.tagCategories[category][tag].includes(hash)) {
            db.tagCategories[category][tag].push(hash);
          }
        });
      });
    }

    writeDB(db);
    res.json({ success: true });
  });

  function readDB() {
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8') || '{}');
    } catch {
      return { videos: {}, tagCategories: {}, playlists: {}, fileDetails: {} };
    }
  }

  function writeDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  }

  async function generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      // read first 2MB (or less)
      const size = Math.min(2 * 1024 * 1024, Math.max(1, (fs.existsSync(filePath) ? fs.statSync(filePath).size : 1)));
      const stream = fs.createReadStream(filePath, { start: 0, end: size - 1 });

      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  return router;
}

module.exports = createRouter;
