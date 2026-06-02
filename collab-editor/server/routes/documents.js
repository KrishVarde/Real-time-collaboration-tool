const express = require('express');
const router = express.Router();
const multer = require('multer');
const mammoth = require('mammoth');
const HTMLtoDOCX = require('html-to-docx');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');

// Multer: store DOCX in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.originalname.endsWith('.docx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .docx files are allowed'));
    }
  },
});

// ─── GET /api/documents ───────────────────────────────────────────────────────
// List all documents (summary only)
router.get('/', async (req, res, next) => {
  try {
    const docs = await Document.find(
      {},
      'roomId title activeUsers updatedAt createdAt lastEditedBy'
    ).sort({ updatedAt: -1 });
    res.json({ success: true, documents: docs });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/documents ──────────────────────────────────────────────────────
// Create new blank document
router.post('/', async (req, res, next) => {
  try {
    const { title } = req.body;
    const roomId = uuidv4();
    const doc = await Document.create({
      roomId,
      title: title || 'Untitled Document',
      content: '',
    });
    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/documents/:roomId ───────────────────────────────────────────────
// Fetch a single document by roomId
router.get('/:roomId', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ roomId: req.params.roomId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/documents/:roomId/title ──────────────────────────────────────
// Update document title
router.patch('/:roomId/title', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const doc = await Document.findOneAndUpdate(
      { roomId: req.params.roomId },
      { title: title.trim() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, document: doc });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/documents/:roomId/revisions ────────────────────────────────────
// Get revision history
router.get('/:roomId/revisions', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ roomId: req.params.roomId }, 'revisions title roomId');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    // Return revisions newest first
    const revisions = [...doc.revisions].reverse();
    res.json({ success: true, revisions });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/documents/upload ──────────────────────────────────────────────
// Upload DOCX and parse to HTML
router.post('/upload/docx', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Convert DOCX buffer to HTML using mammoth
    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    const html = result.value;

    // Create new room for uploaded document
    const roomId = uuidv4();
    const title = req.file.originalname.replace('.docx', '');

    const doc = await Document.create({ roomId, title, content: html });

    res.status(201).json({
      success: true,
      document: doc,
      warnings: result.messages,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/documents/:roomId/export ───────────────────────────────────────
// Export document as DOCX
router.get('/:roomId/export', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ roomId: req.params.roomId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const htmlContent = `<!DOCTYPE html><html><body>${doc.content || '<p></p>'}</body></html>`;
    const docxBuffer = await HTMLtoDOCX(htmlContent, null, {
      title: doc.title,
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    });

    const filename = encodeURIComponent(doc.title || 'document') + '.docx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(docxBuffer);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/documents/:roomId ───────────────────────────────────────────
router.delete('/:roomId', async (req, res, next) => {
  try {
    const doc = await Document.findOneAndDelete({ roomId: req.params.roomId });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
