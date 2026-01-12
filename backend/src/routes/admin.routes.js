// backend/src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary storage
const adminController = require('../controllers/admin.controller');

// POST /api/admin/upload
router.post('/upload', upload.single('file'), adminController.uploadToIPFS);

module.exports = router;