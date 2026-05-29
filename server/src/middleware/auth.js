import Admin from '../models/Admin.js';

// Middleware to authenticate Super Admin using the key in env
export const authenticateSuperAdmin = (req, res, next) => {
  const superAdminKey = req.headers['x-super-admin-key'] || req.headers['authorization']?.split(' ')[1];
  
  if (!superAdminKey || superAdminKey !== process.env.SUPER_ADMIN_KEY) {
    return res.status(401).json({ message: 'Unauthorized: Invalid Super Admin key' });
  }
  
  next();
};

// Middleware to authenticate Admin using their database token and email
export const authenticateAdmin = async (req, res, next) => {
  const adminToken = req.headers['x-admin-token'] || req.headers['authorization']?.split(' ')[1];
  const adminEmail = req.headers['x-admin-email'];
  
  if (!adminToken || !adminEmail) {
    return res.status(401).json({ message: 'Unauthorized: Admin email and token are required' });
  }
  
  try {
    const admin = await Admin.findOne({ 
      token: adminToken, 
      email: adminEmail.trim().toLowerCase() 
    });
    
    if (!admin) {
      return res.status(401).json({ message: 'Unauthorized: Invalid email or token credentials' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin Auth Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
