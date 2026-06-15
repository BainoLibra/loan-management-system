require('dotenv').config();
const { app, disconnect, ready } = require('./app');

const port = process.env.PORT || 4000;
let server;

(async () => {
  try {
    await ready;
    server = app.listen(port, '0.0.0.0', () => {
      console.log(`Backend listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to initialize database. Server not started.', err);
    process.exit(1);
  }
})();

// Graceful shutdown
async function gracefulShutdown() {
  console.log('Received shutdown signal. Closing server gracefully...');
  
  if (!server) {
    console.log('Server was not running. Exiting.');
    await disconnect().catch((err) => console.error('Error disconnecting database:', err));
    process.exit(0);
  }

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close database connection
    try {
      await disconnect();
      console.log('Database disconnected');
    } catch (err) {
      console.error('Error disconnecting database:', err);
    }
    
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Graceful shutdown timeout. Forcing exit.');
    process.exit(1);
  }, 30000).unref();
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
