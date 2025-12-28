const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importCsvTrades, getCsvTemplate } = require('../controllers/csvController');

const router = express.Router();

const uploadDir = '/tmp/csv-uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.csv')
    ) {
      cb(null, true);
    } else {
      const err = new Error('Only CSV files are allowed');
      err.statusCode = 400;
      cb(err, false);
    }
  },
});

router.post('/portfolios/:portfolio_id/import-csv', upload.any(), importCsvTrades);

router.get('/csv-template', getCsvTemplate);

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 50MB.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${error.message}`,
    });
  }
  
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }
  
  next(error);
});

module.exports = router;
