const pool = require('../db/pool');
const { verifyToken } = require('../security/token');

function authenticate(req, res, next) {
  const value = req.get('authorization') || '';
  if (!value.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = verifyToken(value.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

async function ensureUserExists(req, res, next) {
  try {
    const { rows } = await pool.query('SELECT id,email,name,role FROM users WHERE id=$1', [req.user.sub]);
    if (!rows.length) return res.status(401).json({ error: 'User account is unavailable' });
    req.user = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate, requireRole, ensureUserExists };
