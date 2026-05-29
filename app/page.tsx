'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [adminToken, setAdminToken] = useState('');

  return (
    <div className="spin-body min-h-screen flex flex-col justify-between p-4 sm:p-8">
      {/* Top Header */}
      <header className="max-w-6xl mx-auto w-full text-center pt-8 sm:pt-16">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-400 text-xs font-semibold mb-6 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
          Real-Time WebSocket Sync Enabled
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6">
          Interactive <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">Spin Wheel</span> System
        </h1>
        <p className="text-slate-400 text-base sm:text-xl max-w-2xl mx-auto leading-relaxed">
          A high-performance real-time event solution. Drag-to-spin controller displays synced with full-screen video players instantly via WebSockets and MongoDB.
        </p>
      </header>

      {/* Main Grid Options */}
      <main className="max-w-6xl mx-auto w-full my-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* Super Admin Access Card */}
        <div className="glass-panel p-8 flex flex-col justify-between bg-slate-900/40 border border-white/5 hover:border-purple-500/30 transition-all rounded-2xl">
          <div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12a3 3 0 11-6 0 3 3 0 016 0zm0 0c0 1.657 1.007 3 2.25 3S13.5 13.657 13.5 12m-4.5 0C9 10.343 10.007 9 11.25 9S13.5 10.343 13.5 12m0 0a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25m-6 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m0 0V9a2.25 2.25 0 012.25-2.25h.75m0 0a3 3 0 11-6 0 3 3 0 016 0zm-6 0C13.5 5.343 14.507 4 15.75 4S18 5.343 18 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Super Admin Portal</h2>
            <p className="text-slate-400 text-sm mb-6">
              Access using the database secret key. Generate, track, and manage workspace tokens for administrators.
            </p>
          </div>
          <Link
            href="/super-admin"
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-center shadow-lg shadow-purple-500/20 transition-all block"
          >
            Launch Super Admin
          </Link>
        </div>

        {/* Admin Workspace Access Card */}
        <div className="glass-panel p-8 flex flex-col justify-between bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 transition-all rounded-2xl">
          <div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Admin Workspace</h2>
            <p className="text-slate-400 text-sm mb-6">
              Enter your generated Admin token to customize your wheel text slices, colors, upload videos, and reset connected displays.
            </p>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Paste Admin Token here..."
              className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400 transition-all font-mono"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
            />
            <Link
              href={adminToken.trim() ? `/admin?token=${adminToken.trim()}` : '/admin'}
              className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-center shadow-lg shadow-cyan-500/20 transition-all block"
            >
              Enter Admin Workspace
            </Link>
          </div>
        </div>

        {/* System Architecture Flow Card */}
        <div className="glass-panel p-8 flex flex-col justify-between bg-slate-900/40 border border-white/5 rounded-2xl lg:col-span-1 md:col-span-2">
          <div>
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/30 text-pink-400 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Live Demo Sandbox</h2>
            <p className="text-slate-400 text-sm mb-4">
              To test the system immediately, log in to Super Admin using the key from `.env` file, generate a token, open both the controller page and the display page in separate tabs, and spin!
            </p>
          </div>
          <div className="border border-white/5 bg-slate-950/40 rounded-xl p-4 text-xs text-slate-400 space-y-2 font-mono">
            <div><span className="text-cyan-400 font-bold">1. Key:</span> super_admin_secret_key_2026</div>
            <div><span className="text-purple-400 font-bold">2. Socket:</span> http://localhost:5000</div>
            <div><span className="text-pink-400 font-bold">3. Database:</span> MongoDB Community</div>
          </div>
        </div>

      </main>

      {/* Footer Info */}
      <footer className="max-w-6xl mx-auto w-full text-center border-t border-white/5 py-8 mt-12 text-slate-500 text-xs sm:text-sm">
        Spin Wheel Real-time Event System &copy; {new Date().getFullYear()} - Built with Next.js, Express, Socket.io, and MongoDB.
      </footer>
    </div>
  );
}
