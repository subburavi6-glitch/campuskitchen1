
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { email }
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        messFacilityId: user.messFacilityId || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await req.prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: hashedPassword }
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create SCANNER user
router.post('/create-scanner', authenticateToken, requireRole(['FNB_MANAGER', 'ADMIN', 'SUPERADMIN']), async (req, res) => {
  try {
    const { name, email, password, messFacilityId } = req.body;
    if (!name || !email || !password || !messFacilityId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const existing = await req.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await req.prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: 'SCANNER',
        messFacilityId,
        status: 'ACTIVE'
      }
    });
    res.status(201).json({ message: 'Scanner created', user });
  } catch (error) {
    console.error('Create scanner error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;