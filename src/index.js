import { createApp, createRealtimeServer } from './app.js';
import connectDB from './config/dbConfig.js';
import { initializeServerMonitoring } from './config/sentryConfig.js';
import { PORT } from './config/serverConfig.js';
import { reportServerError } from './utils/common/logger.js';

initializeServerMonitoring();

const app = createApp();
const { server } = createRealtimeServer(app);

server.on('error', (error) => {
  reportServerError(error, { lifecycle: 'server.listen' });
});

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  reportServerError(error, { lifecycle: 'server.bootstrap' });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  reportServerError(
    reason instanceof Error ? reason : new Error(String(reason)),
    { lifecycle: 'process.unhandledRejection' }
  );
});

process.on('uncaughtException', (error) => {
  reportServerError(error, { lifecycle: 'process.uncaughtException' });
});
