const buckets = new Map();

const rateLimit = ({
  windowMs = 15 * 60 * 1000,
  max = 1000,
} = {}) => {
  return (req, res, next) => {
    const key = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (bucket.count >= max) {
      return res.status(429).json({
        error: {
          message: "Too many requests",
          code: 429,
        },
      });
    }

    bucket.count += 1;
    return next();
  };
};

module.exports = rateLimit;
