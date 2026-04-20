import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - ioredis and rate-limit-redis types mismatch sometimes
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  message: {
    status: 429,
    message: 'Too many requests, please try again later.'
  }
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error
    sendCommand: (...args: string[]) => redis.call(...args),
  }),
  keyGenerator: (req) => {
    // Role based rate limiting could be added here if req.user is available
    return req.ip || 'unknown';
  },
  message: {
    status: 429,
    message: 'Upload limit reached, please try again in an hour.'
  }
});
