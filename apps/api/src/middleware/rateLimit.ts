import rateLimit from 'express-rate-limit';

export const generateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  message: { error: 'Too many sources created. Please wait before trying again.' },
});
