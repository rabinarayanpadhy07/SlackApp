import express from 'express';

import {
  listThreadMessagesController,
  listThreadsController
} from '../../controllers/threadController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get(
  '/workspaces/:workspaceId/threads',
  isAuthenticated,
  listThreadsController
);

router.get(
  '/workspaces/:workspaceId/threads/:threadId/messages',
  isAuthenticated,
  listThreadMessagesController
);

export default router;

