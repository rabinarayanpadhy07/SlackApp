import express from 'express';

import { getChannelByIdController } from '../../controllers/channelController.js';
import { markChannelAsReadController } from '../../controllers/readReceiptController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/:channelId', isAuthenticated, getChannelByIdController);

router.put('/:channelId/read', isAuthenticated, markChannelAsReadController);

export default router;