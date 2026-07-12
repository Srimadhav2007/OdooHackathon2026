const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();


// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format'
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check uniqueness
    const existingEmployee = await pool.query(
      'SELECT id FROM employee WHERE email = $1',
      [normalizedEmail]
    );

    if (existingEmployee.rows.length > 0) {
      return res.status(409).json({
        message: 'Email already registered'
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create employee
    const result = await pool.query(
      `
      INSERT INTO employee (
        name,
        email,
        password,
        role
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        name,
        email,
        role,
        status,
        department_id,
        created_at
      `,
      [
        name.trim(),
        normalizedEmail,
        hashedPassword,
        'EMPLOYEE'
      ]
    );

    const user = result.rows[0];

    res.status(201).json({
      message: 'Employee created successfully',
      user
    });

  } catch (err) {
    next(err);
  }
});


// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find employee
    const result = await pool.query(
      `
      SELECT *
      FROM employee
      WHERE email = $1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const employee = result.rows[0];

    // Optional: reject disabled employee
    if (!employee.status) {
      return res.status(403).json({
        message: 'Employee account is disabled'
      });
    }

    // 2. Compare password
    const passwordMatches = await bcrypt.compare(
      password,
      employee.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // 3. Sign tokens
    const tokenPayload = {
      id: employee.id,
      role: employee.role
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: '15m'
      }
    );

    const refreshToken = jwt.sign(
      tokenPayload,
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: '7d'
      }
    );

    // Remove password
    const { password: _, ...user } = employee;

    // 4. Return tokens
    res.json({
      accessToken,
      refreshToken,
      user
    });

  } catch (err) {
    next(err);
  }
});


// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        message: 'Refresh token is required'
      });
    }

    // 1. Verify refresh token
    const payload = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Check employee still exists and is active
    const result = await pool.query(
      `
      SELECT id, role, status
      FROM employee
      WHERE id = $1
      `,
      [payload.id]
    );

    if (
      result.rows.length === 0 ||
      !result.rows[0].status
    ) {
      return res.status(401).json({
        message: 'Invalid refresh token'
      });
    }

    const employee = result.rows[0];

    // 2. Sign new access token
    const accessToken = jwt.sign(
      {
        id: employee.id,
        role: employee.role
      },
      process.env.JWT_ACCESS_SECRET,
      {
        expiresIn: '15m'
      }
    );

    // 3. Return access token
    res.json({
      accessToken
    });

  } catch (err) {
    if (
      err.name === 'JsonWebTokenError' ||
      err.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired refresh token'
      });
    }

    next(err);
  }
});


// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        department_id,
        created_at
      FROM employee
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: 'Employee not found'
      });
    }

    res.json({
      user: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
});


module.exports = router;