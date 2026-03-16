import express from 'express';

import { listDraftsController } from '../../controllers/draftController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get(
  '/workspaces/:workspaceId/drafts',
  isAuthenticated,
  listDraftsController
);

export default router;

