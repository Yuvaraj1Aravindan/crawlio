const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getPool } = require('../config/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Handle Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const pool = getPool();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, pool);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, pool);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, pool);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, pool);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, pool);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object, pool);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Handle subscription created
async function handleSubscriptionCreated(subscription, pool) {
  try {
    const customerId = subscription.customer;
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0].price.id;
    const status = subscription.status;

    // Get user by Stripe customer ID
    const userResult = await pool.query(
      'SELECT id FROM users WHERE stripe_customer_id = $1',
      [customerId]
    );

    if (userResult.rows.length === 0) {
      logger.error(`No user found for Stripe customer: ${customerId}`);
      return;
    }

    const userId = userResult.rows[0].id;

    // Determine subscription tier based on price ID
    let subscriptionTier = 'free';
    let monthlyRequestsLimit = 1000;

    if (priceId.includes('starter')) {
      subscriptionTier = 'starter';
      monthlyRequestsLimit = 10000;
    } else if (priceId.includes('professional')) {
      subscriptionTier = 'professional';
      monthlyRequestsLimit = 50000;
    } else if (priceId.includes('enterprise')) {
      subscriptionTier = 'enterprise';
      monthlyRequestsLimit = 200000;
    }

    // Insert subscription record
    await pool.query(
      `INSERT INTO subscriptions (
        user_id, stripe_subscription_id, stripe_price_id, status,
        current_period_start, current_period_end, cancel_at_period_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        subscriptionId,
        priceId,
        status,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end
      ]
    );

    // Update user subscription details
    await pool.query(
      `UPDATE users 
       SET subscription_tier = $1, subscription_status = $2, monthly_requests_limit = $3
       WHERE id = $4`,
      [subscriptionTier, status, monthlyRequestsLimit, userId]
    );

    logger.info(`Subscription created: ${subscriptionId} for user: ${userId}`);
  } catch (error) {
    logger.error('Subscription created handler error:', error);
    throw error;
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription, pool) {
  try {
    const subscriptionId = subscription.id;
    const status = subscription.status;
    const priceId = subscription.items.data[0].price.id;

    // Update subscription record
    await pool.query(
      `UPDATE subscriptions 
       SET status = $1, stripe_price_id = $2, current_period_start = $3, 
           current_period_end = $4, cancel_at_period_end = $5
       WHERE stripe_subscription_id = $6`,
      [
        status,
        priceId,
        new Date(subscription.current_period_start * 1000),
        new Date(subscription.current_period_end * 1000),
        subscription.cancel_at_period_end,
        subscriptionId
      ]
    );

    // Determine new subscription tier
    let subscriptionTier = 'free';
    let monthlyRequestsLimit = 1000;

    if (priceId.includes('starter')) {
      subscriptionTier = 'starter';
      monthlyRequestsLimit = 10000;
    } else if (priceId.includes('professional')) {
      subscriptionTier = 'professional';
      monthlyRequestsLimit = 50000;
    } else if (priceId.includes('enterprise')) {
      subscriptionTier = 'enterprise';
      monthlyRequestsLimit = 200000;
    }

    // Update user subscription details
    await pool.query(
      `UPDATE users 
       SET subscription_tier = $1, subscription_status = $2, monthly_requests_limit = $3
       WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $4)`,
      [subscriptionTier, status, monthlyRequestsLimit, subscriptionId]
    );

    logger.info(`Subscription updated: ${subscriptionId}`);
  } catch (error) {
    logger.error('Subscription updated handler error:', error);
    throw error;
  }
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription, pool) {
  try {
    const subscriptionId = subscription.id;

    // Update subscription status
    await pool.query(
      'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
      ['canceled', subscriptionId]
    );

    // Reset user to free tier
    await pool.query(
      `UPDATE users 
       SET subscription_tier = 'free', subscription_status = 'canceled', 
           monthly_requests_limit = 1000
       WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1)`,
      [subscriptionId]
    );

    logger.info(`Subscription deleted: ${subscriptionId}`);
  } catch (error) {
    logger.error('Subscription deleted handler error:', error);
    throw error;
  }
}

// Handle payment succeeded
async function handlePaymentSucceeded(invoice, pool) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      // Reset monthly usage for new billing period
      await pool.query(
        `UPDATE users 
         SET monthly_requests_used = 0
         WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1)`,
        [subscriptionId]
      );

      logger.info(`Payment succeeded for subscription: ${subscriptionId}`);
    }
  } catch (error) {
    logger.error('Payment succeeded handler error:', error);
    throw error;
  }
}

// Handle payment failed
async function handlePaymentFailed(invoice, pool) {
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      // Update subscription status to past_due
      await pool.query(
        'UPDATE subscriptions SET status = $1 WHERE stripe_subscription_id = $2',
        ['past_due', subscriptionId]
      );

      // Update user subscription status
      await pool.query(
        `UPDATE users 
         SET subscription_status = 'past_due'
         WHERE id = (SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1)`,
        [subscriptionId]
      );

      logger.info(`Payment failed for subscription: ${subscriptionId}`);
    }
  } catch (error) {
    logger.error('Payment failed handler error:', error);
    throw error;
  }
}

// Handle trial will end
async function handleTrialWillEnd(subscription, pool) {
  try {
    const subscriptionId = subscription.id;
    
    // Send notification or update status
    logger.info(`Trial will end for subscription: ${subscriptionId}`);
    
    // You could send an email notification here
    // await sendTrialEndingEmail(subscription);
    
  } catch (error) {
    logger.error('Trial will end handler error:', error);
    throw error;
  }
}

module.exports = router;
