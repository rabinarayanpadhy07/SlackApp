import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { StatusCodes } from 'http-status-codes';
import { Server } from 'socket.io';

import bullServerAdapter from './config/bullBoardConfig.js';
import connectDB from './config/dbConfig.js';
import passport from './config/passportConfig.js'; // Added this line
import {
  API_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  CORS_ALLOWED_ORIGINS,
  NODE_ENV,
  PORT,
  REQUEST_SIZE_LIMIT
} from './config/serverConfig.js';
import ChannelSocketHandlers from './controllers/channelSocketController.js';
import DirectMessageSocketHandlers from './controllers/directMessageSocketController.js';
import HuddleSocketHandlers from './controllers/huddleSocketController.js';
import MessageSocketHandlers from './controllers/messageSocketController.js';
import PresenceSocketHandlers from './controllers/presenceSocketController.js';
import { verifyEmailController } from './controllers/workspaceController.js';
import { createRateLimiter } from './middlewares/rateLimitMiddleware.js';
import { applySecurityHeaders } from './middlewares/securityHeadersMiddleware.js';
import apiRouter from './routes/apiRoutes.js';

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const parsedOrigin = new URL(origin);
    return ['localhost', '127.0.0.1'].includes(parsedOrigin.hostname);
  } catch {
    return false;
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin || NODE_ENV !== 'production') {
    return true;
  }

  if (CORS_ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }

  return isLocalDevelopmentOrigin(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`Blocked CORS origin: ${origin}`);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

app.disable('x-powered-by');
app.use(applySecurityHeaders);
app.use(cors(corsOptions));

app.use(express.json({ limit: REQUEST_SIZE_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: REQUEST_SIZE_LIMIT }));

app.use(passport.initialize()); // Added this line

app.use('/ui', bullServerAdapter.getRouter());

app.use(
  '/api',
  createRateLimiter({
    windowMs: API_RATE_LIMIT_WINDOW_MS,
    max: API_RATE_LIMIT_MAX,
    message: 'API rate limit exceeded',
    keyPrefix: 'api'
  })
);
app.use('/api', apiRouter);

app.get('/verify/:token', verifyEmailController);

app.get('/ping', (req, res) => {
  return res.status(StatusCodes.OK).json({ message: 'pong' });
});

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // socket.on('messageFromClient', (data) => {
  //   console.log('Message from client', data);

  //   io.emit('new message', data.toUpperCase()); // broasdcast
  // });
  MessageSocketHandlers(io, socket);
  ChannelSocketHandlers(io, socket);
  DirectMessageSocketHandlers(io, socket);
  PresenceSocketHandlers(io, socket);
  HuddleSocketHandlers(io, socket);
});

server.on('error', (error) => {
  console.error('Server failed to start', error);
});

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Application bootstrap failed', error);
  process.exit(1);
});
