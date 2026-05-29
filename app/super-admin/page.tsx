'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface AdminAccount {
  _id: string;
  name: string;
  email: string;
  organizationName?: string;
  isDeleted?: boolean;
  token: string;
  options: any[];
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [superAdminKey, setSuperAdminKey] = useState<string>('');
  const [adminEmail, setAdminEmail] = useState<string>('');
  const [adminOrganizationName, setAdminOrganizationName] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('');
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('super_admin_key');
    if (savedKey) {
      verifyKey(savedKey);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const verifyKey = async (key: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-key': key,
        },
      });

      if (res.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('super_admin_key', key);
        setSuperAdminKey(key);
        fetchAdmins(key);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.message || 'Invalid Super Admin key');
        localStorage.removeItem('super_admin_key');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to the server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAdmins = async (key: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        headers: {
          'x-super-admin-key': key,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      } else {
        showToast('Failed to fetch admins', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading admins', 'error');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminKey.trim()) return;
    verifyKey(superAdminKey.trim());
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim() || !adminOrganizationName.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-key': superAdminKey,
        },
        body: JSON.stringify({ 
          email: adminEmail.trim(), 
          organizationName: adminOrganizationName.trim(),
          name: adminName.trim() || undefined 
        }),
      });

      if (res.ok) {
        showToast('Admin token generated successfully', 'success');
        setAdminEmail('');
        setAdminOrganizationName('');
        setAdminName('');
        fetchAdmins(superAdminKey);
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Failed to generate token', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error generating token', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to deactivate/delete admin "${name}"? The admin will lose access immediately, but their configuration data will be kept in the database.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${id}`, {
        method: 'DELETE',
        headers: {
          'x-super-admin-key': superAdminKey,
        },
      });

      if (res.ok) {
        showToast(`Admin "${name}" deactivated`, 'info');
        fetchAdmins(superAdminKey);
      } else {
        showToast('Failed to deactivate admin', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error deactivating admin', 'error');
    }
  };

  const handleRestoreAdmin = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to restore and reactivate admin "${name}"? they will regain access immediately.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/super-admin/admins/${id}/restore`, {
        method: 'POST',
        headers: {
          'x-super-admin-key': superAdminKey,
        },
      });

      if (res.ok) {
        showToast(`Admin "${name}" reactivated`, 'success');
        fetchAdmins(superAdminKey);
      } else {
        showToast('Failed to reactivate admin', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error reactivating admin', 'error');
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text);
    showToast(message, 'success');
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_key');
    setIsAuthenticated(false);
    setSuperAdminKey('');
    setAdmins([]);
    showToast('Logged out successfully', 'info');
  };

  if (!isAuthenticated) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl bg-slate-900/60 backdrop-blur-xl">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-full bg-purple-600/10 border border-purple-500/30 text-purple-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12a3 3 0 11-6 0 3 3 0 016 0zm0 0c0 1.657 1.007 3 2.25 3S13.5 13.657 13.5 12m-4.5 0C9 10.343 10.007 9 11.25 9S13.5 10.343 13.5 12m0 0a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25m-6 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m0 0V9a2.25 2.25 0 012.25-2.25h.75m0 0a3 3 0 11-6 0 3 3 0 016 0zm-6 0C13.5 5.343 14.507 4 15.75 4S18 5.343 18 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Super Admin portal</h1>
            <p className="text-slate-400 text-sm">Enter the Super Admin key to manage admin tokens</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Super Admin Secret Key</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all"
                placeholder="Enter secret key..."
                value={superAdminKey}
                onChange={(e) => setSuperAdminKey(e.target.value)}
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
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-2xl backdrop-blur-xl">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
              Super Admin <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Dashboard</span>
            </h1>
            <p className="text-slate-400 text-sm">Create and manage access tokens for individual admin instances.</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-red-500/20 hover:border-red-500 bg-red-950/20 text-red-400 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Token Sidebar */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-white/10 p-6 rounded-2xl shadow-xl backdrop-blur-xl h-fit">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Generate Admin Token
            </h2>
            <p className="text-slate-400 text-xs mb-6">Generating a token registers a new unique spin wheel instance and database entry isolated for this user.</p>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Email Address (Required)</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. contact@admin.com..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Organization Name (Required)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all"
                  value={adminOrganizationName}
                  onChange={(e) => setAdminOrganizationName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Admin Display Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Event Room A..."
                  className="w-full px-4 py-2.5 bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Generate Token
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Admins List Table */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="p-6 border-bottom border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Active Admin Tokens ({admins.length})
              </h2>
            </div>

            {admins.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                No admin tokens generated yet. Generate your first one above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-slate-950/20 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="p-4">Admin Name</th>
                      <th className="p-4">Token Key</th>
                      <th className="p-4">Options</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {admins.map((admin) => {
                      const wheelUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/wheel/${admin.token}`;
                      const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/display/${admin.token}`;
                      const adminUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/admin?email=${admin.email}&token=${admin.token}`;

                      return (
                        <tr key={admin._id} className={`hover:bg-white/2 transition-colors ${admin.isDeleted ? 'opacity-50 bg-slate-950/30' : ''}`}>
                          <td className="p-4 font-semibold text-white">
                            {admin.name}
                            {admin.organizationName && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-semibold rounded border border-purple-500/30">
                                {admin.organizationName}
                              </span>
                            )}
                            {admin.isDeleted && (
                              <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-semibold rounded border border-red-500/30">
                                Deactivated
                              </span>
                            )}
                            <div className="text-xxs font-mono text-cyan-400 mt-0.5">
                              {admin.email}
                            </div>
                            <div className="text-[10px] font-normal text-slate-500 mt-1">
                              Created: {new Date(admin.createdAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="token-badge">{admin.token}</span>
                              <button
                                onClick={() => copyToClipboard(admin.token, 'Token copied to clipboard!')}
                                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                title="Copy Token"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 font-medium">
                            {admin.options ? admin.options.length : 0} slices
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Quick access links */}
                              <div className="dropdown relative group">
                                <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1">
                                  Links
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <div className="absolute right-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-2 hidden group-hover:block z-50 text-left">
                                  <button
                                    onClick={() => copyToClipboard(adminUrl, 'Admin URL copied!')}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    Copy Admin Link
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(wheelUrl, 'Wheel URL copied!')}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    Copy Wheel Link
                                  </button>
                                  <button
                                    onClick={() => copyToClipboard(displayUrl, 'Display URL copied!')}
                                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-2"
                                  >
                                    Copy Display Link
                                  </button>
                                </div>
                              </div>

                              {admin.isDeleted ? (
                                <button
                                  onClick={() => handleRestoreAdmin(admin._id, admin.name)}
                                  className="p-2 border border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-500/10 text-emerald-400 hover:text-white rounded-lg transition-all"
                                  title="Reactivate Admin"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18v3" />
                                  </svg>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleDeleteAdmin(admin._id, admin.name)}
                                  className="p-2 border border-red-500/20 hover:border-red-500 hover:bg-red-500/10 text-red-400 hover:text-white rounded-lg transition-all"
                                  title="Deactivate Admin"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
