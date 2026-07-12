const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingEmployee = await prisma.employee.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingEmployee) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.employee.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashedPassword,
        role: 'EMPLOYEE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
      }
    });

    res.status(201).json({ message: 'Employee created successfully', user });

  } catch (err) {
    next(err);
  }
});


// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const employee = await prisma.employee.findUnique({
      where: { email: normalizedEmail }
    });

    if (!employee) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!employee.status) {
      return res.status(403).json({ message: 'Employee account is disabled' });
    }

    const passwordMatches = await bcrypt.compare(password, employee.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const tokenPayload = {
      id: employee.id.toString(), // Convert BigInt to string for JWT
      role: employee.role
    };

    const accessToken = jwt.sign(tokenPayload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

    const { passwordHash, ...user } = employee;

    res.json({ accessToken, refreshToken, user });

  } catch (err) {
    next(err);
  }
});


// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const employee = await prisma.employee.findUnique({
      where: { id: BigInt(payload.id) }
    });

    if (!employee || !employee.status) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { id: employee.id.toString(), role: employee.role },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ accessToken });

  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }
    next(err);
  }
});


// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: BigInt(req.user.id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        departmentId: true,
        createdAt: true,
      }
    });

    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    res.json({ user: employee });

  } catch (err) {
    next(err);
  }
});

module.exports = router;