const pool = require('../db/pool');

async function listProducts(_req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT id,name,price_cents,stock FROM products ORDER BY id'
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  const { name, priceCents, stock } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || !Number.isSafeInteger(priceCents) || priceCents < 1 ||
      !Number.isSafeInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'Name, positive priceCents, and non-negative stock are required' });
  }
  try {
    const { rows: [product] } = await pool.query(
      'INSERT INTO products(name,price_cents,stock) VALUES ($1,$2,$3) RETURNING id,name,price_cents,stock',
      [name.trim(), priceCents, stock]
    );
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  const { name, priceCents, stock } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || !Number.isSafeInteger(priceCents) || priceCents < 1 ||
      !Number.isSafeInteger(stock) || stock < 0) {
    return res.status(400).json({ error: 'Name, positive priceCents, and non-negative stock are required' });
  }
  try {
    const { rows: [product] } = await pool.query(
      'UPDATE products SET name=$1,price_cents=$2,stock=$3 WHERE id=$4 RETURNING id,name,price_cents,stock',
      [name.trim(), priceCents, stock, req.params.id]
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    next(error);
  }
}

module.exports = { listProducts, createProduct, updateProduct };
