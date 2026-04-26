const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // Authenticate every socket connection via JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins a private room keyed by their user ID
    socket.join(`user_${socket.user.id}`);
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { init, getIO };
