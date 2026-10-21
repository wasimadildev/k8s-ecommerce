const createApp = require('./app');
const env = require('./config/env');
const pool = require('./db/pool');
const { initializeSchema } = require('./db/schema');

async function startServer() {
  await initializeSchema();
  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`API listening on ${env.port}`);
  });

  const shutdown = () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = { startServer };
