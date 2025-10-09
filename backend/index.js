// server.js
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

// default initial folder (will be added to folders.json on first run if missing)
const DEFAULT_VIDEO_DIR = "X:\\";
const FOLDERS_DB = path.join(__dirname, 'folders.json');

const VIDEO_EXTS = ['.mp4', '.mkv', '.mov', '.avi'];

function readFoldersFile() {
  try {
    if (!fs.existsSync(FOLDERS_DB)) {
      const initial = [
        {
          id: 'f0',
          name: path.basename(DEFAULT_VIDEO_DIR) || DEFAULT_VIDEO_DIR,
          path: DEFAULT_VIDEO_DIR,
          active: true
        }
      ];
      fs.writeFileSync(FOLDERS_DB, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    const raw = fs.readFileSync(FOLDERS_DB, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Failed to read folders.json', err);
    return [];
  }
}

function writeFoldersFile(data) {
  fs.writeFileSync(FOLDERS_DB, JSON.stringify(data, null, 2), 'utf8');
}

function generateFolderId() {
  return 'f' + Date.now().toString(36);
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function listFilesInFolder(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    return files.filter(f => VIDEO_EXTS.includes(path.extname(f).toLowerCase()));
  } catch (err) {
    // Could be permission or folder not exist
    console.warn(`Failed to read folder ${folderPath}:`, err.message);
    return [];
  }
}

function computeFolderStats(folderPath) {
  let count = 0;
  let totalSize = 0;
  try {
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      if (VIDEO_EXTS.includes(ext)) {
        count++;
        try {
          const stats = fs.statSync(path.join(folderPath, file));
          totalSize += stats.size;
        } catch (e) {
          // ignore single-file stat errors
        }
      }
    });
  } catch (err) {
    // can't read folder
  }
  return { count, totalSize, formattedSize: formatFileSize(totalSize) };
}

/* ---------- Helpers for encoded names / serving across folders ---------- */
function getActiveFolders() {
  const all = readFoldersFile();
  return all.filter(f => f.active && f.path);
}

function getAllFilesFromActiveFolders() {
  const active = getActiveFolders();
  const list = [];
  active.forEach(folder => {
    const files = listFilesInFolder(folder.path);
    files.forEach(f => {
      list.push({
        encodedName: `${folder.id}::${f}`,
        fileName: f,
        folderId: folder.id,
        folderPath: folder.path,
        fullPath: path.join(folder.path, f)
      });
    });
  });
  return list;
}

function findFileByEncoded(encoded) {
  if (!encoded) return null;
  const parts = encoded.split('::');
  if (parts.length < 2) return null;
  const folderId = parts[0];
  const fileName = parts.slice(1).join('::');
  const folders = readFoldersFile();
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return null;
  const fullPath = path.join(folder.path, fileName);
  if (!fs.existsSync(fullPath)) return null;
  return { folder, fileName, fullPath };
}

/* ---------- expose a file resolver to primaryDb handler ---------- */
function resolveFilePath(encodedName) {
  const info = findFileByEncoded(encodedName);
  return info ? info.fullPath : null;
}
// --- add this near the top of server.js, before app.use('/api', ...) ---

// verify passcode (simple session-less check)
app.post('/api/verify-passcode', (req, res) => {
  const { password } = req.body || {};
  if (password === PASSCODE) {
    return res.json({ success: true });
  } else {
    return res.status(401).json({ success: false, message: 'Wrong password' });
  }
});

app.use('/api', createPrimaryDBHandler(resolveFilePath));

/* ---------- Folders management API ---------- */

app.get('/api/folders', (req, res) => {
  const data = readFoldersFile();
  const enriched = data.map(f => {
    let count = 0, totalSize = 0, formattedSize = '0 B';
    try {
      if (fs.existsSync(f.path)) {
        const stats = computeFolderStats(f.path);
        count = stats.count;
        totalSize = stats.totalSize;
        formattedSize = stats.formattedSize;
      }
    } catch (e) {
      // ignore
    }
    return { ...f, count, totalSize, formattedSize };
  });
  res.json(enriched);
});

// helper to sanitize incoming path string from client
function sanitizeIncomingPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  let p = rawPath.trim();

  // if browser provided file:// URI, handle it
  if (/^file:\/\//i.test(p)) {
    // remove file://
    p = p.replace(/^file:\/\//i, '');
    // Windows file URIs can start with extra slashes like ///C:/...
    p = p.replace(/^\/+/, '');
    try { p = decodeURIComponent(p); } catch (e) { /* ignore */ }
  }

  // If it came as text/uri-list it may contain newlines; take first line
  if (p.includes('\n')) p = p.split('\n')[0];

  // Replace forward slashes with backslashes only on Windows style if needed? Use path.resolve which handles it.
  // Use path.normalize/resolve to get absolute path
  try {
    p = path.resolve(p);
  } catch (e) {
    // fallback to raw
  }
  return p;
}

app.post('/api/folders', (req, res) => {
  const folderPathRaw = req.body.path || req.body.folderPath || '';
  const folderPath = sanitizeIncomingPath(folderPathRaw);

  if (!folderPath) return res.status(400).json({ error: 'Missing folder path' });

  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    return res.status(400).json({ error: 'Folder does not exist or is not accessible' });
  }

  const all = readFoldersFile();
  if (all.some(f => path.resolve(f.path) === path.resolve(folderPath))) {
    return res.status(400).json({ error: 'Folder already added' });
  }

  const stats = computeFolderStats(folderPath);

  const newFolder = {
    id: generateFolderId(),
    name: path.basename(folderPath) || folderPath,
    path: folderPath,
    active: true,
    count: stats.count,
    totalSize: stats.totalSize,
    formattedSize: stats.formattedSize
  };

  all.push(newFolder);
  writeFoldersFile(all);
  res.json({ success: true, folder: newFolder });
});

// PUT update folders - accept body { folders: [{ id, active }] } OR { activeIds: [...] }
app.put('/api/folders', (req, res) => {
  const body = req.body || {};
  let all = readFoldersFile();

  if (Array.isArray(body.folders)) {
    const map = {};
    body.folders.forEach(f => { if (f && f.id) map[f.id] = !!f.active; });
    all = all.map(f => ({ ...f, active: !!map[f.id] }));
  } else if (Array.isArray(body.activeIds)) {
    const set = new Set(body.activeIds);
    all = all.map(f => ({ ...f, active: set.has(f.id) }));
  } else {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  writeFoldersFile(all);
  res.json({ success: true, folders: all });
});

// DELETE remove folder by id
app.delete('/api/folders/:id', (req, res) => {
  const id = req.params.id;
  let all = readFoldersFile();
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Folder not found' });
  all.splice(idx, 1);
  writeFoldersFile(all);
  res.json({ success: true });
});

/* ---------- Video listing endpoints (same as before) ---------- */

let shuffledCache = []; // reused for files shuffle

function sendPaginated(res, offset, limit, includeFullList) {
  const paginated = shuffledCache.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  if (includeFullList) {
    res.json({ total: shuffledCache.length, files: paginated, fullList: shuffledCache });
  } else {
    res.json({ total: shuffledCache.length, files: paginated });
  }
}

app.get('/files', (req, res) => {
  const { offset = 0, limit = 150, reshuffle = false } = req.query;

  if (shuffledCache.length === 0 || reshuffle === 'true') {
    const all = getAllFilesFromActiveFolders();
    shuffledCache = all.map(it => it.encodedName);
    for (let i = shuffledCache.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledCache[i], shuffledCache[j]] = [shuffledCache[j], shuffledCache[i]];
    }
    sendPaginated(res, offset, limit, true);
  } else {
    sendPaginated(res, offset, limit, false);
  }
});

app.get('/search', (req, res) => {
  const { q = '', offset = 0, limit = 15 } = req.query;
  const qLower = String(q).trim().toLowerCase();

  const all = getAllFilesFromActiveFolders();
  const matched = qLower ? all.filter(it => it.fileName.toLowerCase().includes(qLower)) : all.slice();
  matched.sort((a, b) => a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase()));
  const total = matched.length;
  const start = parseInt(offset);
  const limitNum = parseInt(limit);
  const paginated = matched.slice(start, start + limitNum).map(it => it.encodedName);

  res.json({ total, files: paginated });
});

app.get('/libraryfiles', (req, res) => {
  const { sortBy = 'fileName', order = 'ascending', offset = 0, limit = 50 } = req.query;
  const all = getAllFilesFromActiveFolders();

  const detailedList = all.map(it => {
    let size = 0;
    try {
      const stats = fs.statSync(it.fullPath);
      size = stats.size;
    } catch (err) {
      size = 0;
    }
    return {
      fileName: it.encodedName,
      size,
      formattedSize: formatFileSize(size)
    };
  });

  detailedList.sort((a, b) => {
    let compareA = a[sortBy];
    let compareB = b[sortBy];
    if (sortBy === 'fileName') {
      compareA = (a.fileName.split('::').slice(1).join('::')).toLowerCase();
      compareB = (b.fileName.split('::').slice(1).join('::')).toLowerCase();
    }
    if (compareA < compareB) return order === 'ascending' ? -1 : 1;
    if (compareA > compareB) return order === 'ascending' ? 1 : -1;
    return 0;
  });

  const paginated = detailedList.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  const totalSize = detailedList.reduce((sum, file) => sum + file.size, 0);

  res.json({ total: detailedList.length, totalSize, files: paginated });
});

app.get('/allfiles', (req, res) => {
  const all = getAllFilesFromActiveFolders();
  res.json(all.map(it => it.encodedName));
});

app.get('/random', (req, res) => {
  const { limit = 8 } = req.query;
  const all = getAllFilesFromActiveFolders().map(it => it.encodedName);
  const shuffled = all.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  res.json(shuffled.slice(0, parseInt(limit)));
});

/* ---------- Video streaming endpoint (supports Range) ---------- */

app.get('/videos/:encoded', (req, res) => {
  const encoded = decodeURIComponent(req.params.encoded || '');
  const info = findFileByEncoded(encoded);
  if (!info) {
    return res.status(404).send('File not found');
  }

  const fullPath = info.fullPath;
  const stat = fs.statSync(fullPath);
  const total = stat.size;
  const range = req.headers.range;

  const ext = path.extname(fullPath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.avi') contentType = 'video/x-msvideo';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

    if (start >= total || end >= total) {
      res.status(416).set({ 'Content-Range': `bytes */${total}` }).end();
      return;
    }

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(fullPath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(fullPath).pipe(res);
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
