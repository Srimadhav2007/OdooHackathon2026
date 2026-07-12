/**
 * app.js — Express application bootstrap
 * Wires together: routes, middleware, Socket.io, Prisma
 */

require('dotenv').config();

// Polyfill BigInt serialization to prevent JSON.stringify crashes
BigInt.prototype.toJSON = function() { return Number(this); };

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const { initSocket } = require('./socket');

// Route imports
const authRoutes = require('./routes/auth');
const departmentRoutes = require('./routes/departments');
const categoryRoutes = require('./routes/categories');
const employeeRoutes = require('./routes/employees');
const assetRoutes = require('./routes/assets');
const allocationRoutes = require('./routes/allocations');
const bookingRoutes = require('./routes/bookings');
const maintenanceRoutes = require('./routes/maintenance');
const auditRoutes = require('./routes/audits');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 AssetFlow API running on http://localhost:${PORT}`);
});
