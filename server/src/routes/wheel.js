import express from 'express';
import Admin from '../models/Admin.js';

const router = express.Router();

// Get wheel options by admin token (publicly readable for the wheel/display screens)
router.get('/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const admin = await Admin.findOne({ token });
    if (!admin) {
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
