const { Pool } = require('pg');
const env = require('../config/env');

const pool = new Pool({
  ...env.postgres,
  max: 10,
  connectionTimeoutMillis: 3000
});

module.exports = pool;
