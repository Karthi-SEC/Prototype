const dotenv = require('dotenv')

dotenv.config()

const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const DATABASE_PATH = process.env.DATABASE_PATH || './data/app.sqlite'

module.exports = {
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CORS_ORIGIN,
  DATABASE_PATH,
}

