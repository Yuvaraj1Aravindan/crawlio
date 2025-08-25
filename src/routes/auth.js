const express = require('express');
const Joi = require('joi');
const { getPool } = require('../config/database');
const { 
  generateToken, 
  hashPassword, 
  comparePassword, 
  generateApiKey,
  authenticateToken 
} = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, first_name, last_name } = value;
    const pool = getPool();

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Generate API key
    const apiKey = generateApiKey();

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, api_key) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, first_name, last_name, api_key, subscription_tier`,
      [email, passwordHash, first_name, last_name, apiKey]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier
      },
      api_key: user.api_key,
      token
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;
    const pool = getPool();

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, first_name, last_name, subscription_tier, subscription_status FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    logger.info(`User logged in: ${email}`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status
      },
      token
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, api_key, subscription_tier, 
              subscription_status, monthly_requests_used, monthly_requests_limit, 
              created_at 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        monthly_requests_used: user.monthly_requests_used,
        monthly_requests_limit: user.monthly_requests_limit,
        created_at: user.created_at
      },
      api_key: user.api_key
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Regenerate API key
router.post('/regenerate-api-key', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const newApiKey = generateApiKey();

    await pool.query(
      'UPDATE users SET api_key = $1 WHERE id = $2',
      [newApiKey, req.user.id]
    );

    logger.info(`API key regenerated for user: ${req.user.email}`);

    res.json({
      message: 'API key regenerated successfully',
      api_key: newApiKey
    });

  } catch (error) {
    logger.error('API key regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate API key' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const pool = getPool();

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, result.rows[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    logger.info(`Password changed for user: ${req.user.email}`);

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    logger.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout (client-side token removal)
router.post('/logout', authenticateToken, (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);
  res.json({ message: 'Logout successful' });
});

module.exports = router;
