# Multi-Device Spin Wheel System

A real-time, multi-device spin wheel event system built with Next.js 16, Express, MongoDB, and Socket.io.

## Quick Start Guide

### 1. Backend Setup
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install the backend dependencies:
   ```bash
   npm install
   ```
3. Make sure MongoDB is running on your machine (default port: `27017`).
4. Set up your `.env` file inside the `server/` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/spin-wheel
   SUPER_ADMIN_KEY=super_admin_secret_key_2026
   FRONTEND_URL=http://localhost:3000
   ```
5. Start the backend server:
   ```bash
   npm start
   ```

### 2. Frontend Setup
1. Navigate to the root directory.
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

---

## Workspace Access Flow

### 1. Generate Access Token
1. Open the Super Admin panel at **[http://localhost:3000/super-admin](http://localhost:3000/super-admin)**.
2. Enter the secret key: `super_admin_secret_key_2026`.
3. Create a new Admin using their **Email Address**.
4. Copy the generated **Admin Token** key.

### 2. Configure Your Wheel Slices
1. Open the Admin Workspace at **[http://localhost:3000/admin](http://localhost:3000/admin)** (or click the copied link).
2. Enter the Admin Email and Token Key.
3. Add slices, customize text labels, select colors, and **upload video files** directly from your device.
4. Click **"Save & Sync Wheel"**.

### 3. Open Event Displays
1. **Attendee Wheel (Tablet/Phone)**: Open the URL `http://localhost:3000/wheel/YOUR_TOKEN`.
2. **Main Projector/TV Screen**: Open the URL `http://localhost:3000/display/YOUR_TOKEN`.
3. Click anywhere on the TV screen once to **enable sound**.
4. Drag/spin the wheel on the tablet. The TV screen will mirror the rotation and play the corresponding video immediately upon stopping!

---

## Technical Details

For complete architectural details, WebSocket protocols, database structure, and Mermaid workflow diagrams, refer to the full system documentation at:
* [full_documentation.md](file:///C:/Users/hp/.gemini/antigravity/brain/74222b1a-60b0-455c-b0f4-e303f3fd5fc7/full_documentation.md)
