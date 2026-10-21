const crypto = require('crypto');
const env = require('../config/env');

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(payload) {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode({ ...payload, exp: Math.floor(Date.now() / 1000) + env.accessTokenTtlSeconds });
  const signature = crypto.createHmac('sha256', env.jwtSecret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = token.split('.');
  if (!header || !body || !signature) throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', env.jwtSecret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired token');
  return payload;
}

module.exports = { signToken, verifyToken };
