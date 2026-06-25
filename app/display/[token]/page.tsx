'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../config';

interface Option {
  text: string;
  videoUrl: string;
  color: string;
}

export default function DisplayPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wheelName, setWheelName] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Display states: 'standby' | 'spinning' | 'video'
  const [displayState, setDisplayState] = useState<'standby' | 'spinning' | 'video'>('standby');
  const displayStateRef = useRef<'standby' | 'spinning' | 'video'>('standby');
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [selectedOptionText, setSelectedOptionText] = useState('');
  const [selectedOptionColor, setSelectedOptionColor] = useState('');
  const [statusText, setStatusText] = useState('');
  // Ref-based audio unlock: persists across renders, not reset by video.load()
  const audioUnlockedRef = useRef(false);
  const [audioPromptVisible, setAudioPromptVisible] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const angleRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Programmatically trigger video playback to bypass strict browser autoplay limits
  useEffect(() => {
    if (videoRef.current) {
      if (displayState === 'video' && currentVideoUrl) {
        videoRef.current.src = currentVideoUrl;
        videoRef.current.load();
        // CRITICAL FIX: Explicitly set muted AFTER load() because load() resets
        // the muted property back to the HTML attribute default, ignoring React's
        // muted prop. We must set it imperatively every single time.
        videoRef.current.muted = !audioUnlockedRef.current;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Autoplay blocked:', err);
          });
        }
      } else {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    }
  }, [displayState, currentVideoUrl]);

  // Fetch wheel config on mount
  useEffect(() => {
    const fetchWheel = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/wheel/${token}`);
        if (res.ok) {
          const data = await res.json();
          setWheelName(data.name);
          setOptions(data.options || []);
          setLoading(false);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Wheel configuration not found');
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to connect to the server');
        setLoading(false);
      }
    };

    fetchWheel();
  }, [token]);

  // Draw wheel on canvas
  const drawWheel = (angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas || options.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    ctx.clearRect(0, 0, width, height);

    const numSlices = options.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    // Draw slices
    options.forEach((opt, idx) => {
      const startAngle = angle + idx * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Slice background
      ctx.fillStyle = opt.color;
      ctx.fill();

      // Slice border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Text rotation and drawing
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';

      const fontSize = numSlices > 8 ? '16px' : '20px';
      ctx.font = `bold ${fontSize} Outfit, sans-serif`;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;

      ctx.fillText(opt.text, radius - 30, 0);
      ctx.restore();
    });

    // Draw outer boundary ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Draw inner glow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 4, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  // Re-draw wheel on initial load
  useEffect(() => {
    if (!loading && !error) {
      drawWheel(angleRef.current);
    }
  }, [options, loading, error]);

  // Handle socket events
  useEffect(() => {
    if (!loading && !error) {
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
      });

      socketRef.current.emit('room:join', { token, role: 'display' });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        console.log('Video Display connected to room');
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });

      socketRef.current.on('wheel:updated', (newOptions: Option[]) => {
        setOptions(newOptions);
      });

      // Synchronize exact rotation angle
      socketRef.current.on('wheel:rotated', ({ angle }) => {
        angleRef.current = angle;
        drawWheel(angle);

        if (displayStateRef.current !== 'spinning') {
          displayStateRef.current = 'spinning';
          setDisplayState('spinning');
          setStatusText('The wheel is spinning...');
        }
      });

      // Wheel is spinning automatically
      socketRef.current.on('wheel:spinning', () => {
        displayStateRef.current = 'spinning';
        setDisplayState('spinning');
        setStatusText('The wheel is spinning...');
      });

      // Wheel stops and outputs winning slice
      socketRef.current.on('wheel:stopped', ({ optionIndex, option }) => {
        console.log(`Wheel stopped on option: ${option.text}`);
        setSelectedOptionText(option.text);
        setSelectedOptionColor(option.color);
        setStatusText(`Landed on: ${option.text}`);

        setCurrentVideoUrl(option.videoUrl);
        displayStateRef.current = 'video';
        setDisplayState('video');
      });

      // Reset command from admin
      socketRef.current.on('display:reseted', () => {
        resetToStandby();
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [loading, error, token]);

  const resetToStandby = () => {
    displayStateRef.current = 'standby';
    setDisplayState('standby');
    setStatusText('Waiting for next spin...');
    setCurrentVideoUrl('');
    setSelectedOptionText('');
  };

  const enableAudio = () => {
    // Mark as unlocked in ref - this persists across all future renders
    audioUnlockedRef.current = true;
    setAudioPromptVisible(false);

    // Unlock the Web Audio context with a silent sound (required by browsers)
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      console.warn('AudioContext unlock failed', e);
    }

    // If a video is currently playing, immediately unmute it
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.muted = false;
    }
  };

  const handleVideoEnded = () => {
    // Smoothly return to standby when video completes
    resetToStandby();
  };

  if (loading) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-semibold">Configuring Full Screen Display...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel text-center max-w-md p-8 border-red-500/30">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Display Error</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <p className="text-xs text-slate-500">Please provide a valid Room Display Token.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="display-fullscreen">
      {/* ONE-TIME Audio Unlock Overlay — shown only on first load, never again */}
      {audioPromptVisible && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm cursor-pointer"
          onClick={enableAudio}
        >
          <div className="flex flex-col items-center gap-6 animate-fade-in">
            <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400/60 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <span className="text-5xl">🔊</span>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-white tracking-wide mb-2">Tap to Enable Audio</p>
              <p className="text-slate-400 text-base">Click once — audio will work automatically for all videos after this.</p>
            </div>
            <div className="px-10 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-lg rounded-2xl shadow-lg shadow-cyan-500/30 transition-all">
              Enable Audio
            </div>
          </div>
        </div>
      )}

      {/* Standby & Spinning Screen */}
      <div className={`display-standby ${displayState === 'video' ? 'hidden' : ''} flex flex-col items-center justify-center min-h-screen text-center p-6 w-full`}>
        {/* Large Centered Company Branding */}
        <div className="my-auto max-w-4xl flex flex-col items-center gap-6 animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-black tracking-widest text-white uppercase glow-text-primary select-none transition-all duration-300 hover:scale-105">
            {wheelName}
          </h1>
          <div className="w-48 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 rounded-full shadow-lg shadow-cyan-500/20"></div>

          {/* Dynamic Status Notification */}
          <div className="mt-8">
            <p className="text-2xl md:text-3xl font-bold tracking-wider uppercase text-slate-300 font-sans">
              {statusText}
            </p>
            {selectedOptionText && (
              <span
                className="inline-block mt-4 text-xl font-bold px-8 py-3 rounded-full border bg-slate-950/60 border-white/10 animate-pulse shadow-xl"
                style={{ color: selectedOptionColor, borderColor: `${selectedOptionColor}40` }}
              >
                Get Ready!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Video Player — muted prop intentionally omitted; controlled imperatively via ref */}
      <video
        ref={videoRef}
        onEnded={handleVideoEnded}
        className={`display-video-player ${displayState === 'video' && currentVideoUrl ? 'visible' : ''}`}
        controls={false}
        playsInline
      />

      {/* Hidden preloading elements to load Cloudinary/CDN videos in browser cache */}
      <div style={{ display: 'none' }} aria-hidden="true">
        {options.map((opt, idx) => (
          opt.videoUrl && (
            <video
              key={`preload-${idx}`}
              src={opt.videoUrl}
              preload="auto"
              muted
            />
          )
        ))}
      </div>

      {/* Sync Status Badge */}
      <div className="connection-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span className="text-slate-400">{isConnected ? 'Live Sync Active' : 'Disconnected'}</span>
      </div>
    </div>
  );
}
