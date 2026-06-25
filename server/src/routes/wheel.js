import express from 'express';
import Admin from '../models/Admin.js';
import Participant from '../models/Participant.js';

const router = express.Router();

// Register a participant before they spin the wheel
router.post('/:token/register', async (req, res) => {
  const { token } = req.params;
  const { name, phoneNumber } = req.body;

  try {
    // 1. Verify wheel exists
    const admin = await Admin.findOne({ token });
    if (!admin || admin.isDeleted) {
      return res.status(404).json({ message: 'Wheel configuration not found.' });
    }

    // 2. Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (!phoneNumber || !/^\d+$/.test(phoneNumber) || phoneNumber.length < 10) {
      return res.status(400).json({ message: 'A valid phone number of at least 10 digits is required.' });
    }

    // 3. Create and save registration
    const participant = new Participant({
      name: name.trim(),
      phoneNumber,
      adminToken: token,
    });

    await participant.save();

    res.status(201).json({ message: 'Registration successful.' });
  } catch (error) {
    console.error('Error during participant registration:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get wheel options by admin token (publicly readable for the wheel/display screens)
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const admin = await Admin.findOne({ token });
    if (!admin || admin.isDeleted) {
      return res.status(404).json({ message: 'Wheel configuration not found. Invalid token.' });
    }
    
    // Return only name and options (excluding internal fields if any)
    res.json({
      name: admin.name,
      options: admin.options
    });
  } catch (error) {
    console.error('Error fetching public wheel:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
