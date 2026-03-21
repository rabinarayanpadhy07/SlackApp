import express from 'express';
import { searchWorkspaceController } from '../../controllers/searchController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/', isAuthenticated, searchWorkspaceController);

export default router;
