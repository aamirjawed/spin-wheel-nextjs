import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateAdmin } from '../middleware/auth.js';
import Admin from '../models/Admin.js';

const router = express.Router();

// Configure Multer Storage for Video Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter to allow only videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max video size
  }
});

// Verify Admin Token & Get Info
router.post('/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, admin: req.admin });
});

// Get self info and options
router.get('/me', authenticateAdmin, (req, res) => {
  res.json(req.admin);
});

// Update Wheel Options
router.put('/options', authenticateAdmin, async (req, res) => {
  const { options } = req.body;
  
  if (!Array.isArray(options)) {
    return res.status(400).json({ message: 'Options must be an array' });
  }
  
  // Validate options structure
  for (const opt of options) {
    if (!opt.text || !opt.videoUrl || !opt.color) {
      return res.status(400).json({ message: 'Each option must have text, videoUrl, and color' });
    }
  }
  
  try {
    const admin = await Admin.findById(req.admin._id);
    admin.options = options;
    await admin.save();
    
    // Broadcast the update event to WebSocket clients in the admin's room
    // The socket reference can be accessed via req.app.get('io') if set
    const io = req.app.get('io');
    if (io) {
      io.to(admin.token).emit('wheel:updated', admin.options);
    }
    
    res.json({ message: 'Options updated successfully', options: admin.options });
  } catch (error) {
    console.error('Error updating options:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Upload Video File
router.post('/upload-video', authenticateAdmin, (req, res) => {
  upload.single('video')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'No video file provided' });
    }
    
    try {
      // Return file path URL
      const host = req.get('host');
      const protocol = req.protocol;
      const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      
      res.json({
        message: 'Video uploaded successfully',
        videoUrl: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      console.error('Error in video upload route:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
});

export default router;
