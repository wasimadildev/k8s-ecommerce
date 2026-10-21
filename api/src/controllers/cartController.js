const pool = require('../db/pool');

async function getCart(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT c.product_id AS "productId", c.quantity, p.name, p.price_cents, p.stock
       FROM cart_items c JOIN products p ON p.id=c.product_id
       WHERE c.user_id=$1 ORDER BY c.product_id`, [req.user.id]
    );
    res.json({ items: rows });
  } catch (error) {
    next(error);
  }
}

async function replaceCart(req, res, next) {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length > 20 ||
      items.some((item) => !Number.isSafeInteger(item.productId) || item.productId < 1 ||
        !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) ||
      new Set(items.map((item) => item.productId)).size !== items.length) {
    return res.status(400).json({ error: 'Invalid cart' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO carts(user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.user.id]);
    await client.query('DELETE FROM cart_items WHERE user_id=$1', [req.user.id]);
    for (const item of items) {
      const { rows } = await client.query('SELECT stock FROM products WHERE id=$1', [item.productId]);
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Unknown product ${item.productId}` });
      }
      if (rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: `Insufficient stock for product ${item.productId}` });
      }
      await client.query('INSERT INTO cart_items(user_id,product_id,quantity) VALUES ($1,$2,$3)', [req.user.id, item.productId, item.quantity]);
    }
    await client.query('UPDATE carts SET updated_at=NOW() WHERE user_id=$1', [req.user.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error('Cart rollback failed', rollbackError); }
    next(error);
  } finally {
    client.release();
  }
}

module.exports = { getCart, replaceCart };
