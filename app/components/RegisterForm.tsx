'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '../config';

interface RegisterFormProps {
  onSubmit: (data: { name: string; phoneNumber: string }) => void;
  wheelName: string;
  token: string;
}

export default function RegisterForm({ onSubmit, wheelName, token }: RegisterFormProps) {
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only digits (no characters)
    const digitsOnly = val.replace(/\D/g, '');
    setPhoneNumber(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (phoneNumber.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/wheel/${token}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber,
        }),
      });

      if (res.ok) {
        onSubmit({ name: name.trim(), phoneNumber });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || 'Failed to submit registration. Please try again.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Network error. Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-cyan-500/20">
      {/* Background radial accent */}
      <div className="absolute top-[-50px] right-[-50px] w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-50px] left-[-50px] w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="text-center mb-8">
          <span className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
            Register to Spin
          </span>
          <h2 className="text-3xl font-black text-white tracking-tight">
            Welcome to
          </h2>
          <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mt-1">
            {wheelName || 'Spin Wheel'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Full Name
            </label>
            <input
              id="name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="phone-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Phone Number
            </label>
            <input
              id="phone-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="Enter 10-digit number"
              className="w-full px-4 py-3 bg-slate-950 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all text-sm font-mono"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium text-center animate-shake">
              ⚠️ {error}
            </div>
          )}

           <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-900/20 active:scale-[0.98] transition-all text-sm uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? 'Registering...' : 'Submit & Access Wheel'}
          </button>
        </form>
      </div>
    </div>
  );
}
