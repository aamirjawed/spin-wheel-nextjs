import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/Admin.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const admins = await Admin.find({});
    console.log(`Found ${admins.length} admins.`);
    
    for (const admin of admins) {
      console.log(`\nAdmin: ${admin.username} (Org: ${admin.organizationName || 'N/A'})`);
      console.log('Options:');
      admin.options.forEach((opt, idx) => {
        console.log(`  Option ${idx + 1}: ${opt.text}`);
        console.log(`    Color: ${opt.color}`);
        console.log(`    Video URL: ${opt.videoUrl}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

run();
