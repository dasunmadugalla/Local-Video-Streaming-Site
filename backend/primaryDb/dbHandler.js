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

module.exports = router