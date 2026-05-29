export default function registerWheelSockets(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Join a room based on the admin token
    socket.on('room:join', ({ token, role }) => {
      if (!token) {
        return socket.emit('error', { message: 'Token is required to join a room' });
      }
      
      socket.join(token);
      socket.adminToken = token;
      socket.role = role;
      
      console.log(`Socket ${socket.id} joined room ${token} as ${role}`);
      
      // Notify other room members that someone joined
      socket.to(token).emit('room:joined', { socketId: socket.id, role });
    });
    
    // Sync continuous rotation (for real-time wheel drag/spin angle mapping)
    socket.on('wheel:rotate', ({ angle }) => {
      if (socket.adminToken) {
        socket.to(socket.adminToken).emit('wheel:rotated', { angle });
      }
    });
    
    // Wheel starts spinning automatically with velocity
    socket.on('wheel:spin', ({ velocity, targetAngle }) => {
      if (socket.adminToken) {
        socket.to(socket.adminToken).emit('wheel:spinning', { velocity, targetAngle });
      }
    });
    
    // Wheel has stopped on a specific option
    socket.on('wheel:stop', ({ optionIndex, option }) => {
      if (socket.adminToken) {
        console.log(`Wheel in room ${socket.adminToken} stopped on option ${optionIndex}: ${option.text}`);
        socket.to(socket.adminToken).emit('wheel:stopped', { optionIndex, option });
      }
    });
    
    // Reset/standby view (e.g. stop playing video, return to wheel display)
    socket.on('display:reset', () => {
      if (socket.adminToken) {
        socket.to(socket.adminToken).emit('display:reseted');
      }
    });
    
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
