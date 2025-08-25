const express = require('express');
const Joi = require('joi');
const { getPool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Validation schemas
const updateProfileSchema = Joi.object({
  first_name: Joi.string().max(100),
  last_name: Joi.string().max(100)
});

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, subscription_tier, 
              subscription_status, monthly_requests_used, monthly_requests_limit, 
              created_at, updated_at 
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
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    logger.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = updateProfileSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { first_name, last_name } = value;
    const pool = getPool();

    const result = await pool.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name), 
           last_name = COALESCE($2, last_name),
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 
       RETURNING id, email, first_name, last_name, subscription_tier, 
                 subscription_status, monthly_requests_used, monthly_requests_limit`,
      [first_name, last_name, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    logger.info(`Profile updated for user: ${user.email}`);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        subscription_tier: user.subscription_tier,
        subscription_status: user.subscription_status,
        monthly_requests_used: user.monthly_requests_used,
        monthly_requests_limit: user.monthly_requests_limit
      }
    });

  } catch (error) {
    logger.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get usage statistics
router.get('/usage', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT monthly_requests_used, monthly_requests_limit, subscription_tier 
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const usagePercentage = (user.monthly_requests_used / user.monthly_requests_limit) * 100;

    res.json({
      usage: {
        used: user.monthly_requests_used,
        limit: user.monthly_requests_limit,
        remaining: user.monthly_requests_limit - user.monthly_requests_used,
        percentage: Math.round(usagePercentage * 100) / 100
      },
      subscription: {
        tier: user.subscription_tier,
        limit: user.monthly_requests_limit
      }
    });

  } catch (error) {
    logger.error('Usage fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

// Get detailed usage history
router.get('/usage/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    const result = await pool.query(
      `SELECT endpoint, method, status_code, response_time, ip_address, created_at 
       FROM api_usage 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM api_usage WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      usage: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('Usage history fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch usage history' });
  }
});

// Get subscription information
router.get('/subscription', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    const result = await pool.query(
      `SELECT u.subscription_tier, u.subscription_status, u.stripe_customer_id,
              s.stripe_subscription_id, s.stripe_price_id, s.status as subscription_status,
              s.current_period_start, s.current_period_end, s.cancel_at_period_end
       FROM users u 
       LEFT JOIN subscriptions s ON u.id = s.user_id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    res.json({
      subscription: {
        tier: user.subscription_tier,
        status: user.subscription_status,
        stripe_customer_id: user.stripe_customer_id,
        stripe_subscription_id: user.stripe_subscription_id,
        stripe_price_id: user.stripe_price_id,
        current_period_start: user.current_period_start,
        current_period_end: user.current_period_end,
        cancel_at_period_end: user.cancel_at_period_end
      }
    });

  } catch (error) {
    logger.error('Subscription fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();

    // Delete user (cascade will handle related records)
    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING email',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Account deleted for user: ${result.rows[0].email}`);

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    logger.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

module.exports = router;
