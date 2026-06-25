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

  // Video playback controls
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    resetToStandby();
    setIsVideoPaused(false);
    setIsVideoMuted(false);
  };

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPaused(false);
    } else {
      videoRef.current.pause();
      setIsVideoPaused(true);
    }
  };

  // NOTE: Only mutes the video element — audioUnlockedRef is NEVER touched.
  // This keeps the browser audio context permanently active.
  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !videoRef.current.muted;
    videoRef.current.muted = next;
    setIsVideoMuted(next);
  };

  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
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
      <div
        className={`display-video-player ${displayState === 'video' && currentVideoUrl ? 'visible' : ''}`}
        style={{ position: 'relative' }}
        onMouseMove={showControlsTemporarily}
        onTouchStart={showControlsTemporarily}
      >
        <video
          ref={videoRef}
          onEnded={handleVideoEnded}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          controls={false}
          playsInline
        />

        {/* Floating Video Controls Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(2, 6, 23, 0.75)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '9999px',
            padding: '0.6rem 1.4rem',
            zIndex: 40,
            opacity: controlsVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: controlsVisible ? 'auto' : 'none',
          }}
        >
          {/* Play / Pause Button */}
          <button
            onClick={togglePlayPause}
            title={isVideoPaused ? 'Play' : 'Pause'}
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: 'rgba(6, 182, 212, 0.15)',
              border: '1.5px solid rgba(6, 182, 212, 0.5)',
              color: '#22d3ee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isVideoPaused ? (
              // Play icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              // Pause icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>

          {/* Mute / Unmute Button */}
          {/* NOTE: Only mutes video audio — browser audio context stays unlocked */}
          <button
            onClick={toggleMute}
            title={isVideoMuted ? 'Unmute' : 'Mute'}
            style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: isVideoMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
              border: isVideoMuted ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1.5px solid rgba(6, 182, 212, 0.5)',
              color: isVideoMuted ? '#f87171' : '#22d3ee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isVideoMuted ? (
              // Muted icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              // Unmuted icon
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
          </button>
        </div>
      </div>

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
