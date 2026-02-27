// import dotenv from "dotenv";
// dotenv.config();
// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const createPrimaryDBHandler = require('./primaryDb/dbHandler');

const app = express();
const port = 3000;
// const PASSCODE = process.env.PASSWORD;
const PASSCODE = "197944";

app.use(cors());
app.use(express.json());

// default initial folder (will be added to folders.json on first run if missing)
const DEFAULT_VIDEO_DIR = "X:\\";
const FOLDERS_DB = path.join(__dirname, 'folders.json');
const IMPORTED_CATALOG_DB = path.join(__dirname, 'importedCatalog.json');

const VIDEO_EXTS = ['.mp4', '.mkv', '.mov', '.avi'];
const PRIMARY_DB_PATH = path.join(__dirname, 'primaryDb', 'db.json');

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

function readImportedCatalogFile() {
  try {
    if (!fs.existsSync(IMPORTED_CATALOG_DB)) {
      const initial = { byFolderId: {} };
      fs.writeFileSync(IMPORTED_CATALOG_DB, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }

    const raw = fs.readFileSync(IMPORTED_CATALOG_DB, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') {
      return { byFolderId: {} };
    }

    if (!parsed.byFolderId || typeof parsed.byFolderId !== 'object') {
      parsed.byFolderId = {};
    }

    return parsed;
  } catch (err) {
    console.error('Failed to read importedCatalog.json', err);
    return { byFolderId: {} };
  }
}

function writeImportedCatalogFile(data) {
  fs.writeFileSync(IMPORTED_CATALOG_DB, JSON.stringify(data, null, 2), 'utf8');
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

function normalizeCatalogVideoEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.file || typeof raw.file !== 'string') return null;

  return {
    id: raw.id || '',
    file: raw.file,
    title: raw.title || '',
    description: raw.description || '',
    duration: raw.duration || '',
    resolution: raw.resolution || '',
    thumbnail_path: raw.thumbnail_path || '',
    preview_path: raw.preview_path || '',
    tags: raw.tags && typeof raw.tags === 'object' ? raw.tags : {},
    likes: Number.isFinite(raw.likes) ? raw.likes : 0,
    playlists: Array.isArray(raw.playlists) ? raw.playlists : []
  };
}

function resolvePotentialPath(folderPath, rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  if (path.isAbsolute(rawPath)) return rawPath;
  return path.join(folderPath, rawPath);
}

function getCatalogVideosForFolder(folderId) {
  const catalog = readImportedCatalogFile();
  const list = catalog.byFolderId && Array.isArray(catalog.byFolderId[folderId])
    ? catalog.byFolderId[folderId]
    : [];
  return list.map(normalizeCatalogVideoEntry).filter(Boolean);
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
    const catalogVideos = getCatalogVideosForFolder(folder.id);

    if (catalogVideos.length > 0) {
      catalogVideos.forEach((video) => {
        const fileName = video.file;
        list.push({
          encodedName: `${folder.id}::${fileName}`,
          fileName,
          folderId: folder.id,
          folderPath: folder.path,
          fullPath: path.join(folder.path, fileName),
          importedMeta: video
        });
      });
      return;
    }

    const files = listFilesInFolder(folder.path);
    files.forEach((f) => {
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

  const catalogVideos = getCatalogVideosForFolder(folderId);
  const importedMeta = catalogVideos.find(v => v.file === fileName) || null;

  const fullPath = path.join(folder.path, fileName);
  if (!fs.existsSync(fullPath)) return null;

  const previewPath = resolvePotentialPath(folder.path, importedMeta && importedMeta.preview_path);
  const thumbnailPath = resolvePotentialPath(folder.path, importedMeta && importedMeta.thumbnail_path);

  return { folder, fileName, fullPath, importedMeta, previewPath, thumbnailPath };
}

function readPrimaryDB() {
  try {
    const raw = fs.readFileSync(PRIMARY_DB_PATH, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function resolveVideoMeta(dbVideos, encodedName, plainFileName) {
  const videos = dbVideos && typeof dbVideos === 'object' ? dbVideos : {};

  // Prefer exact encoded match if the DB stores encoded file names.
  const exact = Object.values(videos).find(
    (entry) => entry && entry.fileName && entry.fileName === encodedName
  );
  if (exact) return exact;

  const plainLower = normalizeText(plainFileName);
  if (!plainLower) return null;

  // Fallback for existing DB rows that store plain file names.
  const byPlainName = Object.values(videos).find((entry) => {
    if (!entry || !entry.fileName) return false;
    return normalizeText(entry.fileName) === plainLower;
  });

  return byPlainName || null;
}

function matchesSearchQuery(fileInfo, videoMeta, queryLower) {
  if (!queryLower) return true;

  const title = normalizeText(videoMeta && videoMeta.title);
  const fileName = normalizeText(fileInfo && fileInfo.fileName);
  const encodedName = normalizeText(fileInfo && fileInfo.encodedName);

  const tags = videoMeta && typeof videoMeta.tags === 'object'
    ? Object.values(videoMeta.tags)
      .flat()
      .map(tag => normalizeText(tag))
      .filter(Boolean)
    : [];

  if (title.includes(queryLower)) return true;
  if (fileName.includes(queryLower)) return true;
  if (encodedName.includes(queryLower)) return true;
  if (tags.some(tag => tag.includes(queryLower))) return true;

  return false;
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
  const catalog = readImportedCatalogFile();

  const enriched = data.map(f => {
    let count = 0, totalSize = 0, formattedSize = '0 B';

    const importedList = catalog.byFolderId && Array.isArray(catalog.byFolderId[f.id])
      ? catalog.byFolderId[f.id]
      : [];

    if (importedList.length > 0) {
      count = importedList.length;
      formattedSize = '-';
      return { ...f, count, totalSize, formattedSize, sourceType: 'json' };
    }

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
    return { ...f, count, totalSize, formattedSize, sourceType: 'folder' };
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


function hasImportedCatalogForFolder(catalog, folderId) {
  return !!(catalog && catalog.byFolderId && Array.isArray(catalog.byFolderId[folderId]) && catalog.byFolderId[folderId].length > 0);
}

function findFolderByPathAndSection(folders, catalog, folderPath, section) {
  return (folders || []).find((folder) => {
    if (!folder || !folder.path) return false;
    if (path.resolve(folder.path) !== path.resolve(folderPath)) return false;

    const isJsonFolder = hasImportedCatalogForFolder(catalog, folder.id);
    return section === 'json' ? isJsonFolder : !isJsonFolder;
  }) || null;
}

app.post('/api/folders', (req, res) => {
  const folderPathRaw = req.body.path || req.body.folderPath || '';
  const folderPath = sanitizeIncomingPath(folderPathRaw);

  if (!folderPath) return res.status(400).json({ error: 'Missing folder path' });

  // existence + directory check
  if (!fs.existsSync(folderPath)) return res.status(400).json({ error: 'Folder does not exist on server' });
  if (!fs.statSync(folderPath).isDirectory()) return res.status(400).json({ error: 'Path is not a directory' });

  let all = readFoldersFile();
  const catalog = readImportedCatalogFile();

  // avoid duplicates only inside FS section (non-JSON folders)
  if (findFolderByPathAndSection(all, catalog, folderPath, 'fs')) {
    return res.status(400).json({ error: 'Folder already added to File System folders' });
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

app.post('/api/folders/import-json', (req, res) => {
  const payload = req.body && req.body.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const allFolders = readFoldersFile();
  const catalog = readImportedCatalogFile();
  const addedFolders = [];
  const updatedFolders = [];
  let totalVideos = 0;

  Object.entries(payload).forEach(([rawFolderPath, rawVideos]) => {
    const folderPath = sanitizeIncomingPath(rawFolderPath);
    if (!folderPath || !Array.isArray(rawVideos)) return;

    const normalizedVideos = rawVideos
      .map(normalizeCatalogVideoEntry)
      .filter(Boolean);

    if (normalizedVideos.length === 0) return;

    let folder = findFolderByPathAndSection(allFolders, catalog, folderPath, 'json');

    if (!folder) {
      folder = {
        id: generateFolderId(),
        name: path.basename(folderPath) || folderPath,
        path: folderPath,
        active: true
      };
      allFolders.push(folder);
      addedFolders.push(folder.path);
    } else {
      updatedFolders.push(folder.path);
    }

    catalog.byFolderId[folder.id] = normalizedVideos;
    totalVideos += normalizedVideos.length;
  });

  writeFoldersFile(allFolders);
  writeImportedCatalogFile(catalog);

  res.json({
    success: true,
    addedFolders,
    updatedFolders,
    totalVideos
  });
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

  const catalog = readImportedCatalogFile();
  if (catalog.byFolderId && catalog.byFolderId[id]) {
    delete catalog.byFolderId[id];
    writeImportedCatalogFile(catalog);
  }

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
  const qLower = normalizeText(q);

  const all = getAllFilesFromActiveFolders();
  const primaryDB = readPrimaryDB();
  const videos = primaryDB.videos || {};

  const matched = all.filter((it) => {
    const meta = resolveVideoMeta(videos, it.encodedName, it.fileName);
    return matchesSearchQuery(it, meta, qLower);
  });

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

app.get('/tag/:tagName', (req, res) => {
  const { tagName } = req.params;
  const { offset = 0, limit = 15 } = req.query;

  const wantedTag = normalizeText(decodeURIComponent(tagName || ''));
  if (!wantedTag) {
    return res.json({ total: 0, files: [] });
  }

  const all = getAllFilesFromActiveFolders();
  const primaryDB = readPrimaryDB();
  const videos = primaryDB.videos || {};

  const matched = all.filter((it) => {
    const meta = resolveVideoMeta(videos, it.encodedName, it.fileName);
    const tagsObj = (meta && typeof meta.tags === 'object') ? meta.tags : {};

    return Object.values(tagsObj).some((tagList) => {
      if (!Array.isArray(tagList)) return false;
      return tagList.some(tag => normalizeText(tag) === wantedTag);
    });
  });

  matched.sort((a, b) => a.fileName.toLowerCase().localeCompare(b.fileName.toLowerCase()));

  const total = matched.length;
  const start = parseInt(offset);
  const limitNum = parseInt(limit);
  const paginated = matched.slice(start, start + limitNum).map(it => it.encodedName);

  res.json({ total, files: paginated });
});


/* ---------- Video streaming endpoint (supports Range) ---------- */

function streamVideoWithRange(req, res, filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.avi') contentType = 'video/x-msvideo';

  if (!range) {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  const parts = range.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

  if (start >= total || end >= total) {
    res.status(416).send('Requested range not satisfiable');
    return;
  }

  const chunkSize = (end - start) + 1;
  const stream = fs.createReadStream(filePath, { start, end });

  res.writeHead(206, {
    'Content-Range': `bytes ${start}-${end}/${total}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': chunkSize,
    'Content-Type': contentType
  });

  stream.pipe(res);
}

app.get('/videos/:encoded', (req, res) => {
  const encoded = decodeURIComponent(req.params.encoded || '');
  const info = findFileByEncoded(encoded);
  if (!info) {
    return res.status(404).send('File not found');
  }

  return streamVideoWithRange(req, res, info.fullPath);
});

app.get('/previews/:encoded', (req, res) => {
  const encoded = decodeURIComponent(req.params.encoded || '');
  const info = findFileByEncoded(encoded);
  if (!info) return res.status(404).send('File not found');

  let candidatePath = null;
  if (info.importedMeta) {
    candidatePath = info.previewPath && fs.existsSync(info.previewPath) ? info.previewPath : null;
  } else {
    candidatePath = info.fullPath;
  }

  if (!candidatePath || !fs.existsSync(candidatePath)) {
    return res.status(404).send('Preview not found');
  }

  return streamVideoWithRange(req, res, candidatePath);
});

app.get('/thumbnails/:encoded', (req, res) => {
  const encoded = decodeURIComponent(req.params.encoded || '');
  const info = findFileByEncoded(encoded);
  if (!info) return res.status(404).send('File not found');
  if (!info.thumbnailPath || !fs.existsSync(info.thumbnailPath)) {
    return res.status(404).send('Thumbnail not found');
  }

  res.sendFile(info.thumbnailPath);
});


app.post('/api/video-manifest-thumbnail', (req, res) => {
  const { fileName, thumbnailPath } = req.body || {};
  if (!fileName) return res.status(400).json({ error: 'Missing fileName' });

  const encoded = decodeURIComponent(fileName || '');
  const parts = encoded.split('::');
  if (parts.length < 2) return res.status(400).json({ error: 'Invalid fileName' });

  const folderId = parts[0];
  const rawFileName = parts.slice(1).join('::');

  const catalog = readImportedCatalogFile();
  const folderEntries = catalog.byFolderId && Array.isArray(catalog.byFolderId[folderId])
    ? catalog.byFolderId[folderId]
    : null;

  if (!folderEntries) {
    return res.status(400).json({ error: 'Video is not from imported JSON catalog' });
  }

  const index = folderEntries.findIndex((item) => item && item.file === rawFileName);
  if (index === -1) {
    return res.status(404).json({ error: 'Video not found in imported JSON catalog' });
  }

  folderEntries[index] = {
    ...folderEntries[index],
    thumbnail_path: typeof thumbnailPath === 'string' ? thumbnailPath.trim() : ''
  };

  catalog.byFolderId[folderId] = folderEntries;
  writeImportedCatalogFile(catalog);

  return res.json({ success: true });
});

app.get('/api/video-manifest', (req, res) => {
  const encoded = req.query.fileName || req.query.encodedName || '';
  if (!encoded) return res.status(400).json({ error: 'Missing fileName' });

  const info = findFileByEncoded(encoded);
  if (!info) return res.status(404).json({ error: 'File not found' });

  const meta = info.importedMeta || {};
  const title = typeof meta.title === 'string' && meta.title.trim()
    ? meta.title.trim()
    : info.fileName;

  res.json({
    title,
    description: meta.description || '',
    duration: meta.duration || '',
    resolution: meta.resolution || '',
    thumbnailPath: meta.thumbnail_path || '',
    sourceType: info.importedMeta ? 'json' : 'folder',
    hasThumbnail: !!(info.thumbnailPath && fs.existsSync(info.thumbnailPath)),
    hasPreview: !!(info.previewPath && fs.existsSync(info.previewPath))
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
