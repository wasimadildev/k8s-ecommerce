const pool = require('../db/pool');
const { hashPassword, verifyPassword } = require('../security/password');
const { signToken } = require('../security/token');

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

async function register(req, res, next) {
  const { email, password, name } = req.body || {};
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
      typeof password !== 'string' || password.length < 12 || password.length > 128 ||
      typeof name !== 'string' || !name.trim() || name.length > 100) {
    return res.status(400).json({ error: 'Provide a valid name, email, and password of 12-128 characters' });
  }
  try {
    const { rows: [user] } = await pool.query(
      'INSERT INTO users(email,password_hash,name) VALUES (LOWER($1),$2,$3) RETURNING id,email,name,role',
      [email.trim(), hashPassword(password), name.trim()]
    );
    res.status(201).json({ user: publicUser(user), accessToken: signToken({ sub: user.id, role: user.role }) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email is already registered' });
    next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  try {
    const { rows } = await pool.query('SELECT id,email,name,role,password_hash FROM users WHERE email=LOWER($1)', [email.trim()]);
    if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    res.json({ user: publicUser(user), accessToken: signToken({ sub: user.id, role: user.role }) });
  } catch (error) {
    next(error);
  }
}

function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

module.exports = { register, login, me };
