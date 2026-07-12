/**
 * routes/auth.js — Authentication routes
 *
 * POST /api/auth/signup   — Create Employee account (no role selection)
 * POST /api/auth/login    — Return JWT access + refresh tokens
 * POST /api/auth/refresh  — Exchange refresh token for new access token
 * POST /api/auth/logout   — Invalidate session (client-side clear)
 * GET  /api/auth/me       — Return current user profile
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    // TODO (Member A):
    //  1. Validate: name, email (format + uniqueness), password (min 8 chars)
    //  2. Hash password with bcrypt (saltRounds = 10)
    //  3. Create Employee with role = EMPLOYEE (never from req.body)
    //  4. Return sanitized user (no passwordHash)
    res.status(201).json({ message: 'TODO: signup' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    // TODO (Member A):
    //  1. Find employee by email
    //  2. Compare password with bcrypt
    //  3. Sign JWT access token (15m) + refresh token (7d)
    //  4. Return { accessToken, refreshToken, user }
    res.json({ message: 'TODO: login' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    // TODO (Member A):
    //  1. Verify refresh token with JWT_REFRESH_SECRET
    //  2. Sign new access token
    //  3. Return { accessToken }
    res.json({ message: 'TODO: refresh' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    // TODO (Member A): Return full employee record for req.user.id
    res.json({ message: 'TODO: me', userId: req.user.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
