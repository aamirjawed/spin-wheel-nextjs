import express from 'express';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import { authenticateSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// Verify Super Admin Key
router.post('/verify', authenticateSuperAdmin, (req, res) => {
  res.json({ success: true, message: 'Super Admin verified successfully' });
});

// Create/Generate Admin Token
router.post('/admins', authenticateSuperAdmin, async (req, res) => {
  const { email, name, organizationName } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Admin email is required' });
  }
  
  if (!organizationName) {
    return res.status(400).json({ message: 'Organization name is required' });
  }
  
  try {
    // Check if admin with same email already exists
    const existingAdmin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin account with this email already exists' });
    }

    // Generate a unique token: 32 hex chars (16 bytes)
    const token = crypto.randomBytes(16).toString('hex');
    
    const newAdmin = new Admin({
      email: email.trim().toLowerCase(),
      organizationName: organizationName.trim(),
      name: name?.trim() || email.split('@')[0],
      token,
    });
    
    await newAdmin.save();
    
    res.status(201).json({
      message: 'Admin token generated successfully',
      admin: newAdmin,
    });
  } catch (error) {
    console.error('Error generating admin token:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// List all generated Admin Tokens
router.get('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Delete an Admin Token (Soft Delete)
router.delete('/admins/:id', authenticateSuperAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const deletedAdmin = await Admin.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!deletedAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Admin soft-deleted successfully', admin: deletedAdmin });
  } catch (error) {
    console.error('Error soft-deleting admin:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Restore a Soft-Deleted Admin Token
router.post('/admins/:id/restore', authenticateSuperAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    const restoredAdmin = await Admin.findByIdAndUpdate(
      id,
      { isDeleted: false },
      { new: true }
    );
    if (!restoredAdmin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Admin restored successfully', admin: restoredAdmin });
  } catch (error) {
    console.error('Error restoring admin:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
