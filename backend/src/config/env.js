require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});
const requiredEnv = ['DATABASE_URL', 'PORT'];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

module.exports = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
};