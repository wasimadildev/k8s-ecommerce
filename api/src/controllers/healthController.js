const pool = require('../db/pool');

function live(_req, res) {
  res.json({ status: 'alive' });
}

async function ready(_req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (error) {
    console.error('Readiness check failed', error);
    res.status(503).json({ error: 'database unavailable' });
  }
}

module.exports = { live, ready };
