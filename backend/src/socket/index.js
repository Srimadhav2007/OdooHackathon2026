/**
 * socket/index.js — Socket.io initialization and event handlers
 * Emits real-time events to connected clients for:
 *  - Dashboard KPI updates
 *  - Notifications (new notification push)
 *  - Overdue return alerts
 */

const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // TODO (Member A/B): Handle room joining by userId for targeted notifications
    socket.on('join', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Emit a notification event to a specific user.
 * Call this from any service after creating a Notification record.
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Broadcast a dashboard KPI refresh signal to all connected clients.
 */
function broadcastDashboardRefresh() {
  if (io) {
    io.emit('dashboard:refresh');
  }
}

module.exports = { initSocket, emitToUser, broadcastDashboardRefresh };
