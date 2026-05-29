'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';

interface Option {
  _id?: string;
  text: string;
  videoUrl: string;
  color: string;
}

export default function AdminDashboard() {
  const [emailInput, setEmailInput] = useState<string>('');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminName, setAdminName] = useState<string>('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // File upload state for specific indices
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Check URL params or localStorage for token/email on mount
  useEffect(() => {
    // Read from query params
    const queryParams = new URLSearchParams(window.location.search);
    const urlEmail = queryParams.get('email');
    const urlToken = queryParams.get('token');
    const savedEmail = localStorage.getItem('admin_email');
    const savedToken = localStorage.getItem('admin_token');

    const activeEmail = urlEmail || savedEmail;
    const activeToken = urlToken || savedToken;
    
    if (activeEmail && activeToken) {
      setEmailInput(activeEmail);
      setTokenInput(activeToken);
      verifyToken(activeEmail, activeToken);
    }
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
      });

      socketRef.current.emit('room:join', { token, role: 'admin' });

      socketRef.current.on('connect', () => {
        console.log('Admin socket connected');
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, token]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const verifyToken = async (testEmail: string, testToken: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': testEmail.trim().toLowerCase(),
          'x-admin-token': testToken,
          'Authorization': `Bearer ${testToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setIsAuthenticated(true);
        setEmail(testEmail.trim().toLowerCase());
        setToken(testToken);
        setAdminName(data.admin.name);
        setOptions(data.admin.options || []);
        localStorage.setItem('admin_email', testEmail.trim().toLowerCase());
        localStorage.setItem('admin_token', testToken);
        
        // Clean URL parameter
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || 'Invalid admin credentials');
        localStorage.removeItem('admin_email');
        localStorage.removeItem('admin_token');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !tokenInput.trim()) return;
    verifyToken(emailInput.trim(), tokenInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_token');
    setIsAuthenticated(false);
    setEmail('');
    setToken('');
    setOptions([]);
    showToast('Logged out successfully', 'info');
  };

  // Add Option
  const handleAddOption = () => {
    if (options.length >= 12) {
      showToast('Maximum 12 options are allowed on the spin wheel for better readability', 'info');
      return;
    }
    const defaultColors = [
      '#ff4b4b', '#ff9800', '#ffeb3b', '#4caf50', '#00bcd4', '#2196f3', '#9c27b0', '#e91e63'
    ];
    const newColor = defaultColors[options.length % defaultColors.length];
    
    setOptions([
      ...options,
      {
        text: `Option ${options.length + 1}`,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        color: newColor,
      }
    ]);
  };

  // Remove Option
  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      showToast('A spin wheel must have at least 2 options', 'error');
      return;
    }
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  // Update Option field
  const handleOptionChange = (index: number, field: keyof Option, value: string) => {
    const newOptions = [...options];
    newOptions[index] = {
      ...newOptions[index],
      [field]: value
    };
    setOptions(newOptions);
  };

  // Handle Video File Upload
  const handleVideoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      showToast('Please select a valid video file', 'error');
      return;
    }

    setUploadingIndex(index);
    setUploadProgress('Uploading...');

    const formData = new FormData();
    formData.append('video', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/upload-video`, {
        method: 'POST',
        headers: {
          'x-admin-email': email,
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        handleOptionChange(index, 'videoUrl', data.videoUrl);
        showToast('Video uploaded successfully!', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Video upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error uploading video', 'error');
    } finally {
      setUploadingIndex(null);
      setUploadProgress('');
    }
  };

  // Save Wheel Configuration
  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/options`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': email,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ options }),
      });

      if (res.ok) {
        const data = await res.json();
        setOptions(data.options);
        showToast('Wheel settings updated and synced in real-time!', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to save settings', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Emit display reset event
  const triggerDisplayReset = () => {
    if (socketRef.current) {
      socketRef.current.emit('display:reset');
      showToast('Display reset command sent', 'info');
    } else {
      showToast('Socket not connected. Cannot reset.', 'error');
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    showToast(message, 'success');
  };

  if (!isAuthenticated) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl bg-slate-900/60 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-cyan-600/10 border border-cyan-500/30 text-cyan-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2 font-sans">Admin Portal</h1>
            <p className="text-slate-400 text-sm">Enter your Admin Token to configure your Spin Wheel</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Email Address</label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all"
                placeholder="Enter admin email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Token Key</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all font-mono"
                placeholder="Enter 32-character admin token..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-500/30 text-red-400 text-sm rounded-lg text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                'Access Workspace'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const wheelUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/wheel/${token}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/display/${token}`;

  return (
    <div className="spin-body min-h-screen p-4 sm:p-8">
      {/* Toast Messages */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${
            toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'
          }`}>
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
              Admin Workspace: <span className="bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">{adminName}</span>
            </h1>
            <p className="text-slate-400 text-sm">Configure colors, titles, and videos, and control displays in real-time.</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <button
              onClick={triggerDisplayReset}
              className="flex-1 md:flex-none px-4 py-2 border border-yellow-500/20 hover:border-yellow-500 bg-yellow-950/20 text-yellow-400 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              title="Return the full-screen display back to Standby Wheel view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.706 9H18.5" />
              </svg>
              Reset Display Screen
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-500/20 hover:border-red-500 bg-red-950/20 text-red-400 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Settings & Links Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Active Room URLs
              </h2>
              <p className="text-slate-400 text-xs mb-6">Open the Wheel Controller on your tablet/mobile, and the Video Display on the main full-screen TV or projector.</p>
              
              <div className="space-y-4">
                {/* Wheel Link */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">1. Spin Wheel Controller URL</label>
                  <div className="copy-link-box">
                    <div className="copy-link-text">{wheelUrl}</div>
                    <button
                      onClick={() => copyToClipboard(wheelUrl, 'Wheel link copied!')}
                      className="copy-link-btn"
                    >
                      Copy
                    </button>
                  </div>
                  <a
                    href={wheelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    Open Controller Screen
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* Display Link */}
                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">2. Full-Screen Video Display URL</label>
                  <div className="copy-link-box">
                    <div className="copy-link-text">{displayUrl}</div>
                    <button
                      onClick={() => copyToClipboard(displayUrl, 'Display link copied!')}
                      className="copy-link-btn"
                    >
                      Copy
                    </button>
                  </div>
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold"
                  >
                    Open Full-Screen Display
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="bg-slate-900/60 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-2">Workspace Actions</h2>
              <p className="text-slate-400 text-xs mb-4">Save changes to publish edits immediately to all connected devices.</p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save & Sync Wheel
                    </>
                  )}
                </button>

                <button
                  onClick={handleAddOption}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Wheel Option
                </button>
              </div>
            </div>
          </div>

          {/* Options Management */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.003 9.003 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                Configure Wheel Options ({options.length}/12)
              </h2>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-white/5 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center gap-4 transition-all hover:border-white/10"
                >
                  {/* Color Selector */}
                  <div className="flex items-center gap-3">
                    <div className="text-slate-500 font-mono text-sm w-5">{idx + 1}.</div>
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-white/20 shadow-md">
                      <input
                        type="color"
                        value={opt.color}
                        onChange={(e) => handleOptionChange(idx, 'color', e.target.value)}
                        className="absolute inset-[-10px] w-[200%] h-[200%] cursor-pointer border-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Text Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                      placeholder="Slice Display text"
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Video URL/Upload */}
                  <div className="flex-[2] flex flex-col gap-2">
                    <input
                      type="text"
                      value={opt.videoUrl}
                      onChange={(e) => handleOptionChange(idx, 'videoUrl', e.target.value)}
                      placeholder="Video URL (e.g. mp4 link)"
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        disabled={uploadingIndex !== null}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded font-semibold border border-white/5 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Video
                      </button>
                      
                      <input
                        type="file"
                        ref={(el) => { fileInputRefs.current[idx] = el; }}
                        onChange={(e) => handleVideoUpload(idx, e)}
                        accept="video/*"
                        className="hidden"
                      />

                      {uploadingIndex === idx && (
                        <span className="text-xs text-cyan-400 font-semibold animate-pulse">
                          {uploadProgress}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Option */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => handleRemoveOption(idx)}
                      disabled={options.length <= 2}
                      className="p-2 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-red-400 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-all"
                      title="Remove option"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
