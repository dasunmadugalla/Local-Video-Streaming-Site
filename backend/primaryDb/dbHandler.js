const express = require('express')
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, './db.json');

// Route to check DB existence
router.get('/check-db', (req, res) => {
  if (fs.existsSync(dbPath)) {
    res.json({ exists: true });
  } else {
    fs.writeFileSync(dbPath, JSON.stringify(), 'utf8');
    res.json({ exists: false });
  }
});

// Route to add new tag category
router.post('/addCategory', (req, res) => {
  let rawData;
  try {
    rawData = fs.readFileSync(dbPath, 'utf8');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read database file' });
  }

  let db;
  try {
    db = JSON.parse(rawData || '{}');
  } catch (err) {
    return res.status(500).json({ error: 'Failed to parse database file' });
  }

  const { categoryName } = req.body;

  if (!categoryName || typeof categoryName !== 'string') {
    return res.status(400).json({ error: 'Invalid category name' });
  }

  if (!db.tagCategories) {
    db.tagCategories = {};
  }

  if (db.tagCategories[categoryName]) {
    return res.status(400).json({ error: 'Category already exists' });
  }

  db.tagCategories[categoryName] = {};

  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    res.json({ success: true, message: 'Category added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update database file' });
  }
});

module.exports = router;
