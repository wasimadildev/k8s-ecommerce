const pool = require('../db/pool');

function isValidOrder({ customerName, items }) {
  return typeof customerName === 'string' &&
    customerName.trim() &&
    customerName.length <= 100 &&
    Array.isArray(items) &&
    items.length > 0 &&
    items.length <= 20 &&
    items.every((item) =>
      Number.isSafeInteger(item.productId) &&
      item.productId >= 1 &&
      Number.isSafeInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 20
    ) &&
    new Set(items.map((item) => item.productId)).size === items.length;
}

async function listOrders(_req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id,customer_name,total_cents,created_at FROM orders ORDER BY id DESC LIMIT 20'
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function createOrder(req, res, next) {
  const { customerName, items } = req.body || {};
  if (!isValidOrder({ customerName, items })) {
    return res.status(400).json({ error: 'Invalid customer name or cart' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const idempotencyKey = req.get('idempotency-key');
    if (idempotencyKey && (idempotencyKey.length > 128 || !/^[\w-]+$/.test(idempotencyKey))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid Idempotency-Key' });
    }
    if (idempotencyKey) {
      const { rows } = await client.query('SELECT id,total_cents FROM orders WHERE idempotency_key=$1', [idempotencyKey]);
      if (rows.length) {
        await client.query('ROLLBACK');
        return res.status(201).json(rows[0]);
      }
    }

    const sortedItems = [...items].sort((a, b) => a.productId - b.productId);
    let total = 0;
    const details = [];

    for (const item of sortedItems) {
      const { rows } = await client.query(
        'SELECT id,price_cents,stock FROM products WHERE id=$1 FOR UPDATE',
        [item.productId]
      );
      if (!rows.length || rows[0].stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Insufficient stock for product ${item.productId}`
        });
      }
      total += rows[0].price_cents * item.quantity;
      details.push({ ...item, price: rows[0].price_cents });
    }

    const { rows: [order] } = await client.query(
      'INSERT INTO orders(customer_name,total_cents,user_id,idempotency_key) VALUES ($1,$2,$3,$4) RETURNING id,total_cents',
      [customerName.trim(), total, req.user?.id || null, idempotencyKey || null]
    );
    for (const item of details) {
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [
        item.quantity,
        item.productId
      ]);
      await client.query(
        'INSERT INTO order_items(order_id,product_id,quantity,unit_price_cents) VALUES ($1,$2,$3,$4)',
        [order.id, item.productId, item.quantity, item.price]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ id: order.id, total_cents: order.total_cents });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Order rollback failed', rollbackError);
      }
    }
    next(error);
  } finally {
    if (client) client.release();
  }
}

module.exports = { listOrders, createOrder };
