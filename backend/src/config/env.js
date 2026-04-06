require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
  quiet: true,
});
const requiredEnv = ['DATABASE_URL', 'PORT'];
const requiredSecrets = ['JWT_SECRET'];

requiredEnv.concat(requiredSecrets).forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

module.exports = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  rateLimit: {
    enabled: process.env.RATE_LIMIT_DISABLED !== "true",
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 1000),
  },
};
