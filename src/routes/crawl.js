const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { getPool } = require('../config/database');
const { 
  authenticateToken, 
  authenticateApiKey, 
  checkSubscriptionLimits, 
  incrementUsage 
} = require('../middleware/auth');
const CrawlerService = require('../services/crawler');
const { logger } = require('../utils/logger');

const router = express.Router();
const crawlerService = new CrawlerService();

// RAG processing helper methods
const generateSummary = (data) => {
  const text = data.text || '';
  if (text.length < 200) return text;
  
  // Simple extractive summarization - take first few sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 3).join('. ') + '.';
};

const extractEntities = (data) => {
  const text = data.text || '';
  const entities = [];
  
  // Extract potential entities (capitalized words, proper nouns)
  const words = text.split(/\s+/);
  const entityCandidates = words.filter(word => 
    word.length > 2 && 
    /^[A-Z]/.test(word) && 
    !['The', 'This', 'That', 'These', 'Those', 'And', 'Or', 'But'].includes(word)
  );
  
  // Count frequency
  const entityCount = {};
  entityCandidates.forEach(entity => {
    entityCount[entity] = (entityCount[entity] || 0) + 1;
  });
  
  // Return top entities
  return Object.entries(entityCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([entity, count]) => ({ entity, count }));
};

const extractTopics = (data) => {
  const text = data.text || '';
  const topics = [];
  
  // Simple topic extraction based on common patterns
  const topicPatterns = [
    /technology|tech|software|hardware|programming|development/gi,
    /business|company|startup|enterprise|market|industry/gi,
    /science|research|study|experiment|analysis/gi,
    /health|medical|medicine|healthcare|treatment/gi,
    /education|learning|teaching|school|university/gi
  ];
  
  const topicNames = ['Technology', 'Business', 'Science', 'Health', 'Education'];
  
  topicPatterns.forEach((pattern, index) => {
    const matches = text.match(pattern);
    if (matches && matches.length > 2) {
      topics.push({
        topic: topicNames[index],
        relevance: matches.length,
        confidence: Math.min(matches.length / 10, 1)
      });
    }
  });
  
  return topics;
};

const extractKeywords = (data) => {
  const text = data.text || '';
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
  ]);
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));
  
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));
};

// Initialize crawler service
crawlerService.initialize().catch(error => {
  logger.error('Failed to initialize crawler service:', error);
  // Don't fail the entire application if crawler fails to initialize
});

// Validation schemas
const crawlUrlSchema = Joi.object({
  url: Joi.string().uri().required(),
  options: Joi.object({
    userAgent: Joi.string(),
    waitUntil: Joi.string().valid('load', 'domcontentloaded', 'networkidle'),
    waitFor: Joi.number().integer().min(0).max(30000),
    waitForSelector: Joi.string(),
    screenshot: Joi.boolean().default(false),
    extractText: Joi.boolean().default(false),
    extractLinks: Joi.boolean().default(false),
    extractImages: Joi.boolean().default(false),
    extractMeta: Joi.boolean().default(false),
    extractStructuredData: Joi.boolean().default(false),
    selectors: Joi.object(),
    headers: Joi.object(),
    browserOptions: Joi.object()
  }).default({})
});

const batchCrawlSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri()).min(1).max(100).required(),
  options: Joi.object({
    concurrency: Joi.number().integer().min(1).max(20).default(5),
    userAgent: Joi.string(),
    waitUntil: Joi.string().valid('load', 'domcontentloaded', 'networkidle'),
    waitFor: Joi.number().integer().min(0).max(30000),
    waitForSelector: Joi.string(),
    screenshot: Joi.boolean().default(false),
    extractText: Joi.boolean().default(false),
    extractLinks: Joi.boolean().default(false),
    extractImages: Joi.boolean().default(false),
    extractMeta: Joi.boolean().default(false),
    extractStructuredData: Joi.boolean().default(false),
    selectors: Joi.object(),
    headers: Joi.object(),
    browserOptions: Joi.object()
  }).default({})
});

// Middleware to handle both JWT and API key authentication
const authenticateUser = async (req, res, next) => {
  // Try JWT authentication first
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateToken(req, res, next);
  }
  
  // Try API key authentication
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }
  
  return res.status(401).json({ error: 'Authentication required' });
};

// Crawl single URL for RAG applications
router.post('/rag', authenticateUser, checkSubscriptionLimits, incrementUsage, async (req, res) => {
  try {
    const { error, value } = crawlUrlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { url, options } = value;
    const jobId = uuidv4();
    const pool = getPool();

    // Force RAG-optimized options
    const ragOptions = {
      ...options,
      extractText: true,
      extractMeta: true,
      extractStructuredData: true,
      extractLinks: true
    };

    // Create job record
    await pool.query(
      'INSERT INTO crawl_jobs (job_id, user_id, url, status, options) VALUES ($1, $2, $3, $4, $5)',
      [jobId, req.user.id, url, 'processing', ragOptions]
    );

    // Update job status to started
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, started_at = CURRENT_TIMESTAMP WHERE job_id = $2',
      ['started', jobId]
    );

    // Perform the crawl
    const result = await crawlerService.crawlUrl(url, ragOptions);

    // Update job status
    const status = result.success ? 'completed' : 'failed';
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, completed_at = CURRENT_TIMESTAMP, result = $2 WHERE job_id = $3',
      [status, JSON.stringify(result), jobId]
    );

    // Return RAG-optimized response
    if (result.success) {
      const ragResult = {
        job_id: jobId,
        success: true,
        url: result.url,
        metadata: result.metadata,
        rag_data: {
          full_text: result.data.text,
          text_chunks: result.data.textChunks || [],
          sections: result.data.sections || [],
          summary: generateSummary(result.data),
          entities: extractEntities(result.data),
          topics: extractTopics(result.data),
          keywords: extractKeywords(result.data)
        },
        structured_data: {
          meta: result.data.meta || {},
          open_graph: result.data.openGraph || {},
          twitter_card: result.data.twitterCard || {},
          schema: result.data.schema || {},
          links: result.data.links || []
        },
        response_time: result.responseTime
      };

      res.json(ragResult);
    } else {
      res.status(400).json(result);
    }

  } catch (error) {
    logger.error('RAG crawl error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Crawl single URL
router.post('/url', authenticateUser, checkSubscriptionLimits, incrementUsage, async (req, res) => {
  try {
    const { error, value } = crawlUrlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { url, options } = value;
    const jobId = uuidv4();
    const pool = getPool();

    // Create job record
    await pool.query(
      'INSERT INTO crawl_jobs (job_id, user_id, url, status, options) VALUES ($1, $2, $3, $4, $5)',
      [jobId, req.user.id, url, 'processing', options]
    );

    // Update job status to started
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, started_at = CURRENT_TIMESTAMP WHERE job_id = $2',
      ['processing', jobId]
    );

    // Perform crawl
    const result = await crawlerService.crawlUrl(url, options);

    // Update job with result
    await pool.query(
      `UPDATE crawl_jobs 
       SET status = $1, result = $2, error_message = $3, completed_at = CURRENT_TIMESTAMP 
       WHERE job_id = $4`,
      [
        result.success ? 'completed' : 'failed',
        result.success ? result : null,
        result.success ? null : result.error,
        jobId
      ]
    );

    logger.info(`Crawl completed for job ${jobId}: ${url}`);

    res.json({
      job_id: jobId,
      ...result
    });

  } catch (error) {
    logger.error('Crawl error:', error);
    res.status(500).json({ error: 'Crawl failed' });
  }
});

// Batch crawl multiple URLs
router.post('/batch', authenticateUser, checkSubscriptionLimits, incrementUsage, async (req, res) => {
  try {
    const { error, value } = batchCrawlSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { urls, options } = value;
    const jobId = uuidv4();
    const pool = getPool();

    // Check if user has enough remaining requests
    const remainingRequests = req.user.monthly_requests_limit - req.user.monthly_requests_used;
    if (urls.length > remainingRequests) {
      return res.status(429).json({ 
        error: 'Insufficient remaining requests for batch size',
        requested: urls.length,
        remaining: remainingRequests
      });
    }

    // Create job record
    await pool.query(
      'INSERT INTO crawl_jobs (job_id, user_id, url, status, options) VALUES ($1, $2, $3, $4, $5)',
      [jobId, req.user.id, JSON.stringify(urls), 'processing', options]
    );

    // Update job status to started
    await pool.query(
      'UPDATE crawl_jobs SET status = $1, started_at = CURRENT_TIMESTAMP WHERE job_id = $2',
      ['processing', jobId]
    );

    // Perform batch crawl
    const results = await crawlerService.crawlMultiple(urls, options);

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    // Update job with results
    await pool.query(
      `UPDATE crawl_jobs 
       SET status = $1, result = $2, completed_at = CURRENT_TIMESTAMP 
       WHERE job_id = $3`,
      ['completed', { results, summary: { total: results.length, successful, failed } }, jobId]
    );

    logger.info(`Batch crawl completed for job ${jobId}: ${urls.length} URLs`);

    res.json({
      job_id: jobId,
      summary: {
        total: results.length,
        successful,
        failed
      },
      results
    });

  } catch (error) {
    logger.error('Batch crawl error:', error);
    res.status(500).json({ error: 'Batch crawl failed' });
  }
});

// Get job status
router.get('/job/:jobId', authenticateUser, async (req, res) => {
  try {
    const { jobId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'SELECT * FROM crawl_jobs WHERE job_id = $1 AND user_id = $2',
      [jobId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];

    res.json({
      job_id: job.job_id,
      url: job.url,
      status: job.status,
      options: job.options,
      result: job.result,
      error_message: job.error_message,
      started_at: job.started_at,
      completed_at: job.completed_at,
      created_at: job.created_at
    });

  } catch (error) {
    logger.error('Job status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// Get user's crawl history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const pool = getPool();

    const result = await pool.query(
      `SELECT job_id, url, status, created_at, completed_at, 
              CASE WHEN result IS NOT NULL THEN true ELSE false END as has_result
       FROM crawl_jobs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM crawl_jobs WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      jobs: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        pages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    logger.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Delete job
router.delete('/job/:jobId', authenticateUser, async (req, res) => {
  try {
    const { jobId } = req.params;
    const pool = getPool();

    const result = await pool.query(
      'DELETE FROM crawl_jobs WHERE job_id = $1 AND user_id = $2 RETURNING job_id',
      [jobId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    logger.info(`Job deleted: ${jobId} by user: ${req.user.email}`);

    res.json({ message: 'Job deleted successfully' });

  } catch (error) {
    logger.error('Job deletion error:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Get crawling statistics
router.get('/stats', authenticateUser, async (req, res) => {
  try {
    const pool = getPool();

    const statsResult = await pool.query(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
       FROM crawl_jobs 
       WHERE user_id = $1`,
      [req.user.id]
    );

    const recentJobsResult = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM crawl_jobs 
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY status`,
      [req.user.id]
    );

    const stats = statsResult.rows[0];
    const recentJobs = recentJobsResult.rows;

    res.json({
      total_jobs: parseInt(stats.total_jobs),
      completed_jobs: parseInt(stats.completed_jobs),
      failed_jobs: parseInt(stats.failed_jobs),
      processing_jobs: parseInt(stats.processing_jobs),
      avg_duration_seconds: parseFloat(stats.avg_duration_seconds) || 0,
      recent_jobs: recentJobs.reduce((acc, job) => {
        acc[job.status] = parseInt(job.count);
        return acc;
      }, {})
    });

  } catch (error) {
    logger.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
