const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getPool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Subscription plans configuration
const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    monthly_requests: 1000,
    features: ['Basic crawling', 'API access', 'Email support']
  },
  starter: {
    name: 'Starter',
    price: 29,
    stripe_price_id: 'price_starter_monthly',
    monthly_requests: 10000,
    features: ['Advanced crawling', 'Priority support', 'Screenshots', 'Batch processing']
  },
  professional: {
    name: 'Professional',
    price: 99,
    stripe_price_id: 'price_professional_monthly',
    monthly_requests: 50000,
    features: ['All Starter features', 'Custom user agents', 'Concurrent crawling', 'Dedicated support']
  },
  enterprise: {
    name: 'Enterprise',
    price: 299,
    stripe_price_id: 'price_enterprise_monthly',
    monthly_requests: 200000,
    features: ['All Professional features', 'Custom integrations', 'SLA guarantee', 'Account manager']
  }
};

// Get available subscription plans
router.get('/plans', async (req, res) => {
  try {
    res.json({
      plans: SUBSCRIPTION_PLANS,
      current_currency: 'usd'
    });
  } catch (error) {
    logger.error('Plans fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// Create checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const pool = getPool();

    // Get user's current Stripe customer ID or create new one
    let stripeCustomerId = req.user.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.first_name} ${req.user.last_name}`.trim(),
        metadata: {
          user_id: req.user.id.toString()
        }
      });

      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await pool.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [stripeCustomerId, req.user.id]
      );
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing?canceled=true`,
      metadata: {
        user_id: req.user.id.toString()
      }
    });

    logger.info(`Checkout session created for user: ${req.user.email}`);

    res.json({
      session_id: session.id,
      url: session.url
    });

  } catch (error) {
    logger.error('Checkout session creation error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create customer portal session
router.post('/create-portal-session', authenticateToken, async (req, res) => {
  try {
    const { returnUrl } = req.body;
    const pool = getPool();

    // Get user's Stripe customer ID
    const result = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const stripeCustomerId = result.rows[0].stripe_customer_id;

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${process.env.FRONTEND_URL}/dashboard`,
    });

    logger.info(`Portal session created for user: ${req.user.email}`);

    res.json({
      url: session.url
    });

  } catch (error) {
    logger.error('Portal session creation error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();

    // Get user's subscription
    const result = await pool.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const stripeSubscriptionId = result.rows[0].stripe_subscription_id;

    // Cancel subscription at period end
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update database
    await pool.query(
      'UPDATE subscriptions SET cancel_at_period_end = true WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );

    logger.info(`Subscription canceled for user: ${req.user.email}`);

    res.json({ message: 'Subscription will be canceled at the end of the current period' });

  } catch (error) {
    logger.error('Subscription cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/reactivate', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();

    // Get user's subscription
    const result = await pool.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND cancel_at_period_end = true',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No subscription found to reactivate' });
    }

    const stripeSubscriptionId = result.rows[0].stripe_subscription_id;

    // Reactivate subscription
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update database
    await pool.query(
      'UPDATE subscriptions SET cancel_at_period_end = false WHERE stripe_subscription_id = $1',
      [stripeSubscriptionId]
    );

    logger.info(`Subscription reactivated for user: ${req.user.email}`);

    res.json({ message: 'Subscription reactivated successfully' });

  } catch (error) {
    logger.error('Subscription reactivation error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// Get subscription invoices
router.get('/invoices', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();

    // Get user's Stripe customer ID
    const result = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].stripe_customer_id) {
      return res.status(404).json({ error: 'No subscription found' });
    }

    const stripeCustomerId = result.rows[0].stripe_customer_id;

    // Get invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: stripeCustomerId,
      limit: 20,
    });

    res.json({
      invoices: invoices.data.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        created: invoice.created,
        due_date: invoice.due_date,
        pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url
      }))
    });

  } catch (error) {
    logger.error('Invoices fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Upgrade subscription (change plan)
router.post('/upgrade', authenticateToken, async (req, res) => {
  try {
    const { newPriceId } = req.body;

    if (!newPriceId) {
      return res.status(400).json({ error: 'New price ID is required' });
    }

    const pool = getPool();

    // Get user's current subscription
    const result = await pool.query(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const stripeSubscriptionId = result.rows[0].stripe_subscription_id;

    // Get current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Update subscription with new price
    const updatedSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update database
    await pool.query(
      'UPDATE subscriptions SET stripe_price_id = $1 WHERE stripe_subscription_id = $2',
      [newPriceId, stripeSubscriptionId]
    );

    logger.info(`Subscription upgraded for user: ${req.user.email}`);

    res.json({
      message: 'Subscription upgraded successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        current_period_end: updatedSubscription.current_period_end
      }
    });

  } catch (error) {
    logger.error('Subscription upgrade error:', error);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

module.exports = router;
