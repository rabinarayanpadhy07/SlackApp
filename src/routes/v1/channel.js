import express from 'express';

import {
  deleteChannelController,
  getChannelByIdController,
  updateChannelController
} from '../../controllers/channelController.js';
import { markChannelAsReadController } from '../../controllers/readReceiptController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';
import { updateChannelSchema } from '../../validators/channelSchema.js';
import { validate } from '../../validators/zodValidator.js';

const router = express.Router();

router.get('/:channelId', isAuthenticated, getChannelByIdController);
router.put('/:channelId', isAuthenticated, validate(updateChannelSchema), updateChannelController);
router.delete('/:channelId', isAuthenticated, deleteChannelController);

router.put('/:channelId/read', isAuthenticated, markChannelAsReadController);

export default router;
