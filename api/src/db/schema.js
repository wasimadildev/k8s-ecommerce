const pool = require('./pool');

const schema = `
CREATE TABLE IF NOT EXISTS products (
 id SERIAL PRIMARY KEY, name TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK (price_cents > 0),
 stock INTEGER NOT NULL CHECK (stock >= 0));
CREATE TABLE IF NOT EXISTS users (
 id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS carts (
 user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS cart_items (
 user_id BIGINT NOT NULL REFERENCES carts(user_id) ON DELETE CASCADE,
 product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 quantity INTEGER NOT NULL CHECK (quantity > 0),
 PRIMARY KEY (user_id, product_id));
CREATE TABLE IF NOT EXISTS orders (
 id BIGSERIAL PRIMARY KEY, customer_name TEXT NOT NULL, total_cents INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
 user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
 idempotency_key TEXT UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE IF NOT EXISTS order_items (
 id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES orders(id),
 product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL CHECK (quantity > 0),
 unit_price_cents INTEGER NOT NULL);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
INSERT INTO products(id,name,price_cents,stock) VALUES
 (1,'Mechanical Keyboard',7900,15),(2,'Wireless Mouse',3500,25),
 (3,'USB-C Hub',4900,20),(4,'27-inch Monitor',21900,8)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('products','id'), (SELECT MAX(id) FROM products));`;

async function initializeSchema() {
  // Demo-only bootstrapping. Production systems should run controlled versioned migrations.
  await pool.query(schema);
}

module.exports = { initializeSchema };
