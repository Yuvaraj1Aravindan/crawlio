const redis = require('redis');
const { logger } = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Redis max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready to accept commands');
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redisClient;
};

const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

// Cache utilities
const cacheGet = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 3600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

const cacheDelete = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
};

const cacheExists = async (key) => {
  try {
    return await redisClient.exists(key);
  } catch (error) {
    logger.error('Cache exists error:', error);
    return false;
  }
};

// Rate limiting utilities
const incrementRateLimit = async (key, windowMs) => {
  try {
    const multi = redisClient.multi();
    multi.incr(key);
    multi.expire(key, Math.floor(windowMs / 1000));
    const results = await multi.exec();
    return results[0];
  } catch (error) {
    logger.error('Rate limit increment error:', error);
    return 0;
  }
};

const getRateLimit = async (key) => {
  try {
    const count = await redisClient.get(key);
    return parseInt(count) || 0;
  } catch (error) {
    logger.error('Rate limit get error:', error);
    return 0;
  }
};

module.exports = {
  connectRedis,
  getRedisClient,
  closeRedis,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheExists,
  incrementRateLimit,
  getRateLimit
};
