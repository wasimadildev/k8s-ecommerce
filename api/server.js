const { startServer } = require('./src/server');

startServer().catch((error) => {
  console.error('Initialization failed', error);
  process.exit(1);
});
