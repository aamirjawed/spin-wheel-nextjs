import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  videoUrl: {
    type: String,
    required: true,
    trim: true,
  },
  color: {
    type: String,
    required: true,
    default: '#FF5733',
  },
});

const adminSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: false,
    trim: true,
    default: 'Admin Wheel'
  },
  options: {
    type: [optionSchema],
    default: [
      { text: 'Red Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', color: '#ff4b4b' },
      { text: 'Orange Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4', color: '#ff9800' },
      { text: 'Yellow Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4', color: '#ffeb3b' },
      { text: 'Green Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4', color: '#4caf50' },
      { text: 'Blue Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4', color: '#2196f3' },
      { text: 'Purple Option', videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4', color: '#9c27b0' }
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
