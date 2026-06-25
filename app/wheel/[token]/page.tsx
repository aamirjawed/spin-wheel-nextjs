'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../../config';
import RegisterForm from '../../components/RegisterForm';

interface Option {
  text: string;
  videoUrl: string;
  color: string;
  showVideo?: boolean;
  isVisible?: boolean;
  isWinningOption?: boolean;
}

export default function WheelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = React.use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wheelName, setWheelName] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleRegisterSubmit = (data: { name: string; phoneNumber: string }) => {
    // Optionally we can store it or just set to true to unlock the wheel
    setIsRegistered(true);
  };

  const handleWheelReset = () => {
    if (socketRef.current) {
      socketRef.current.emit('display:reset');
    }
    setSelectedOption(null);
    setIsRegistered(false);
  };

  // Only render options that are marked visible
  const visibleOptions = options.filter(o => o.isVisible !== false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  
  // Animation / Drag Physics Refs
  const stateRef = useRef({
    angle: 0,
    isDragging: false,
    dragStartAngle: 0,
    dragStartTime: 0,
    dragAngles: [] as { angle: number; time: number }[],
    velocity: 0,
    animFrame: 0,
    optionsCount: 0,
  });

  // Fetch wheel config on mount
  useEffect(() => {
    const fetchWheel = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/wheel/${token}`);
        if (res.ok) {
          const data = await res.json();
          setWheelName(data.name);
          setOptions(data.options || []);
          stateRef.current.optionsCount = (data.options || []).filter((o: Option) => o.isVisible !== false).length;
          setLoading(false);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.message || 'Wheel not found');
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

  // Handle socket connection
  useEffect(() => {
    if (!loading && !error) {
      socketRef.current = io(SOCKET_URL, {
        withCredentials: true,
      });

      socketRef.current.emit('room:join', { token, role: 'wheel' });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        console.log('Wheel controller connected to room');
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
      });

      socketRef.current.on('wheel:updated', (newOptions: Option[]) => {
        setOptions(newOptions);
        stateRef.current.optionsCount = newOptions.filter(o => o.isVisible !== false).length;
      });

      socketRef.current.on('display:reseted', () => {
        setIsRegistered(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [loading, error, token]);

  // Draw the wheel on canvas
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas || visibleOptions.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, width, height);

    const numSlices = visibleOptions.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const currentAngle = stateRef.current.angle;

    // Draw slices
    visibleOptions.forEach((opt, idx) => {
      const startAngle = currentAngle + idx * sliceAngle;
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
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text rotation and drawing
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      
      // Responsive font sizing based on slice count
      const fontSize = numSlices > 8 ? '14px' : '18px';
      ctx.font = `bold ${fontSize} Outfit, sans-serif`;
      
      // Shadow for text readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      
      // Draw text
      const maxTextWidth = radius - 40;
      ctx.fillText(opt.text, radius - 20, 0);
      
      ctx.restore();
    });

    // Draw outer boundary ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw inner glow indicator
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius - 3, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Re-draw wheel on angle change
  useEffect(() => {
    drawWheel();
  }, [options, loading]);

  // Determine which option is selected
  const getSelectedOption = (angle: number): { index: number; option: Option } => {
    const numSlices = visibleOptions.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    let relativeAngle = (1.5 * Math.PI - angle) % (2 * Math.PI);
    if (relativeAngle < 0) relativeAngle += 2 * Math.PI;
    const index = Math.floor(relativeAngle / sliceAngle) % numSlices;
    return { index, option: visibleOptions[index] };
  };

  // Inertia physics animation loop
  const animate = () => {
    const state = stateRef.current;
    
    if (state.isDragging) return;

    if (Math.abs(state.velocity) > 0.001) {
      // Apply friction
      state.velocity *= 0.985;
      state.angle += state.velocity;
      
      // Normalize angle
      state.angle = state.angle % (2 * Math.PI);

      drawWheel();
      
      // Sync rotation to socket
      if (socketRef.current) {
        socketRef.current.emit('wheel:rotate', { angle: state.angle });
      }

      state.animFrame = requestAnimationFrame(animate);
    } else {
      state.velocity = 0;
      // Wheel has come to a stop
      const selection = getSelectedOption(state.angle);
      setSelectedOption(selection.option);
      
      if (socketRef.current) {
        socketRef.current.emit('wheel:stop', {
          optionIndex: selection.index,
          option: selection.option
        });
      }
    }
  };

  // Interaction handlers
  const handleInteractionStart = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    const angle = Math.atan2(y, x);
    const state = stateRef.current;

    // Tap to stop physics
    if (Math.abs(state.velocity) > 0.05) {
      cancelAnimationFrame(state.animFrame);
      state.velocity = 0;
      const selection = getSelectedOption(state.angle);
      setSelectedOption(selection.option);
      if (socketRef.current) {
        socketRef.current.emit('wheel:stop', {
          optionIndex: selection.index,
          option: selection.option
        });
      }
      return;
    }

    state.isDragging = true;
    state.dragStartAngle = angle - state.angle;
    state.dragStartTime = Date.now();
    state.dragAngles = [{ angle: state.angle, time: Date.now() }];
    
    cancelAnimationFrame(state.animFrame);
  };

  const handleInteractionMove = (clientX: number, clientY: number) => {
    const state = stateRef.current;
    if (!state.isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    const dragAngle = Math.atan2(y, x);
    const newAngle = dragAngle - state.dragStartAngle;

    state.angle = newAngle % (2 * Math.PI);
    drawWheel();

    // Store track points for velocity calculation
    const now = Date.now();
    state.dragAngles.push({ angle: state.angle, time: now });
    if (state.dragAngles.length > 5) {
      state.dragAngles.shift();
    }

    // Sync angle in real-time with display
    if (socketRef.current) {
      socketRef.current.emit('wheel:rotate', { angle: state.angle });
    }
  };

  const handleInteractionEnd = () => {
    const state = stateRef.current;
    if (!state.isDragging) return;

    state.isDragging = false;

    // Calculate exit velocity
    if (state.dragAngles.length >= 2) {
      const p1 = state.dragAngles[0];
      const p2 = state.dragAngles[state.dragAngles.length - 1];
      const dt = p2.time - p1.time;
      
      if (dt > 10) {
        // Calculate shortest angular distance to prevent loop issues
        let da = p2.angle - p1.angle;
        while (da < -Math.PI) da += 2 * Math.PI;
        while (da > Math.PI) da -= 2 * Math.PI;

        state.velocity = da / (dt / 16.67); // velocity in angle/frame (assuming 60fps)
      }
    }

    // Cap maximum velocity to avoid spinning forever
    const maxVelocity = 0.5;
    if (state.velocity > maxVelocity) state.velocity = maxVelocity;
    if (state.velocity < -maxVelocity) state.velocity = -maxVelocity;

    const minVelocityThreshold = 0.015;
    if (Math.abs(state.velocity) > minVelocityThreshold) {
      // Check if the natural stop would land on a non-winning option
      const direction = Math.sign(state.velocity);
      const decelerationMultiplier = 0.985 / 0.015;
      
      let predictedFinalAngle = (state.angle + state.velocity * decelerationMultiplier) % (2 * Math.PI);
      if (predictedFinalAngle < 0) predictedFinalAngle += 2 * Math.PI;

      const normalSelection = getSelectedOption(predictedFinalAngle);

      if (normalSelection.option && normalSelection.option.isWinningOption === false) {
        const winningItems = visibleOptions
          .map((o, idx) => ({ option: o, idx }))
          .filter(item => item.option.isWinningOption !== false);

        if (winningItems.length > 0) {
          let closestItem = winningItems[0];
          let minDistance = Infinity;
          for (const item of winningItems) {
            let dist = Math.abs(item.idx - normalSelection.index);
            if (dist > visibleOptions.length / 2) {
              dist = visibleOptions.length - dist;
            }
            if (dist < minDistance) {
              minDistance = dist;
              closestItem = item;
            }
          }

          const numSlices = visibleOptions.length;
          const sliceAngle = (2 * Math.PI) / numSlices;
          const targetRelativeAngle = (closestItem.idx + 0.5) * sliceAngle;
          
          let targetAngle = (1.5 * Math.PI - targetRelativeAngle) % (2 * Math.PI);
          if (targetAngle < 0) targetAngle += 2 * Math.PI;

          let angleDiff = targetAngle - state.angle;
          if (direction > 0) {
            while (angleDiff < 0) angleDiff += 2 * Math.PI;
            const totalDistance = angleDiff + 3 * (2 * Math.PI);
            state.velocity = totalDistance / decelerationMultiplier;
          } else {
            while (angleDiff > 0) angleDiff -= 2 * Math.PI;
            const totalDistance = angleDiff - 3 * (2 * Math.PI);
            state.velocity = totalDistance / decelerationMultiplier;
          }
        }
      }

      // Emit starting automatic spin
      if (socketRef.current) {
        socketRef.current.emit('wheel:spin', { velocity: state.velocity });
      }
      setSelectedOption(null);
      state.animFrame = requestAnimationFrame(animate);
    } else {
      // Stopped without high speed (just manual drag placement)
      state.velocity = 0;
      let selection = getSelectedOption(state.angle);
      
      if (selection.option && selection.option.isWinningOption === false) {
        const winningItems = visibleOptions
          .map((o, idx) => ({ option: o, idx }))
          .filter(item => item.option.isWinningOption !== false);

        if (winningItems.length > 0) {
          let closestItem = winningItems[0];
          let minDistance = Infinity;
          for (const item of winningItems) {
            let dist = Math.abs(item.idx - selection.index);
            if (dist > visibleOptions.length / 2) {
              dist = visibleOptions.length - dist;
            }
            if (dist < minDistance) {
              minDistance = dist;
              closestItem = item;
            }
          }

          const numSlices = visibleOptions.length;
          const sliceAngle = (2 * Math.PI) / numSlices;
          const targetRelativeAngle = (closestItem.idx + 0.5) * sliceAngle;
          
          let targetAngle = (1.5 * Math.PI - targetRelativeAngle) % (2 * Math.PI);
          if (targetAngle < 0) targetAngle += 2 * Math.PI;

          state.angle = targetAngle;
          drawWheel();
          
          if (socketRef.current) {
            socketRef.current.emit('wheel:rotate', { angle: state.angle });
          }
          selection = { index: closestItem.idx, option: closestItem.option };
        }
      }

      setSelectedOption(selection.option);
      if (socketRef.current) {
        socketRef.current.emit('wheel:stop', {
          optionIndex: selection.index,
          option: selection.option
        });
      }
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleInteractionStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleInteractionMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleInteractionEnd();
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleInteractionStart(touch.clientX, touch.clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleInteractionMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    handleInteractionEnd();
  };

  if (loading) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-semibold">Loading wheel setup...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel text-center max-w-md p-8 border-red-500/30">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <p className="text-xs text-slate-500">Ensure the URL token matches a generated admin token.</p>
        </div>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="spin-body min-h-screen flex items-center justify-center p-4">
        <RegisterForm onSubmit={handleRegisterSubmit} wheelName={wheelName} token={token} />
      </div>
    );
  }

  return (
    <div className="spin-body min-h-screen flex flex-col justify-between items-center py-8 px-4 select-none">
      {/* Top Header */}
      <div className="text-center mt-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
          {wheelName} <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">Spin Wheel</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm">Drag or flick the wheel to spin. Tap to stop.</p>
      </div>

      {/* Interactive Wheel Canvas */}
      <div className="wheel-outer-wrapper my-auto relative">
        <div className="wheel-marker"></div>
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="wheel-canvas"
        />
        <div className="wheel-center-pin"></div>
      </div>

      {/* Selected Option Display */}
      <div className="mb-6 flex flex-col items-center gap-4">
        {selectedOption ? (
          <div className="flex flex-col items-center gap-3">
            <div className="wheel-selected-display animate-pulse">
              <div className="wheel-selected-title">LANDED ON</div>
              <div className="wheel-selected-value font-extrabold text-center" style={{ color: selectedOption.color }}>
                {selectedOption.text}
              </div>
            </div>
            <button
              onClick={handleWheelReset}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
            >
              Reset for Next User
            </button>
          </div>
        ) : (
          <div className="py-5 text-slate-500 font-medium text-sm text-center">
            {stateRef.current.isDragging ? 'Dragging wheel...' : 'Spinning...'}
          </div>
        )}
      </div>

      {/* Connection Indicator */}
      <div className="connection-status">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></div>
        <span>{isConnected ? 'Sync Connected' : 'Sync Disconnected'}</span>
      </div>
    </div>
  );
}
