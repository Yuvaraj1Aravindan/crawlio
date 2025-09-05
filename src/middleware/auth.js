const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { logger } = require('../utils/logger');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = getPool();
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, subscription_tier, subscription_status, monthly_requests_used, monthly_requests_limit FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    logger.error('Token authentication error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to authenticate API keys
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // Allow demo API key
    if (apiKey === 'RL5QwFrR1PkFU2d5m15MrI3LF1XhrlQH') {
      req.user = {
        id: 1,
        email: 'demo@crawlio.com',
        first_name: 'Demo',
        last_name: 'User',
        subscription_tier: 'free',
        subscription_status: 'active',
        monthly_requests_used: 0,
        monthly_requests_limit: 1000
      };
      return next();
    }

    const pool = getPool();
    
    // Get user from database by API key
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, subscription_tier, subscription_status, monthly_requests_used, monthly_requests_limit FROM users WHERE api_key = $1',
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Middleware to check subscription limits
const checkSubscriptionLimits = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user has exceeded monthly request limit
    if (user.monthly_requests_used >= user.monthly_requests_limit) {
      return res.status(429).json({ 
        error: 'Monthly request limit exceeded',
        limit: user.monthly_requests_limit,
        used: user.monthly_requests_used
      });
    }

    // Check subscription status
    if (user.subscription_status !== 'active') {
      return res.status(403).json({ 
        error: 'Subscription not active',
        status: user.subscription_status
      });
    }

    next();
  } catch (error) {
    logger.error('Subscription limit check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to increment usage
const incrementUsage = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      return next();
    }

    // Increment usage count
    const pool = getPool();
    await pool.query(
      'UPDATE users SET monthly_requests_used = monthly_requests_used + 1 WHERE id = $1',
      [user.id]
    );

    next();
  } catch (error) {
    logger.error('Usage increment error:', error);
    // Don't fail the request if usage tracking fails
    next();
  }
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate API key
const generateApiKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  checkSubscriptionLimits,
  incrementUsage,
  generateToken,
  hashPassword,
  comparePassword,
  generateApiKey
};
