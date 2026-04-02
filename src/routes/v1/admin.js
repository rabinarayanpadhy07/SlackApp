import express from 'express';

import {
  deleteAdminMessageController,
  deleteAdminWorkspaceController,
  getAdminOverviewController,
  listAdminAuditLogsController,
  listAdminMessagesController,
  listAdminPaymentsController,
  listAdminUsersController,
  listAdminWorkspacesController,
  updateAdminUserController,
  updateAdminWorkspaceController} from '../../controllers/adminController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';
import { requireSuperAdmin } from '../../middlewares/superAdminMiddleware.js';

const adminRouter = express.Router();

adminRouter.use(isAuthenticated, requireSuperAdmin);

adminRouter.get('/overview', getAdminOverviewController);
adminRouter.get('/users', listAdminUsersController);
adminRouter.patch('/users/:userId', updateAdminUserController);
adminRouter.get('/workspaces', listAdminWorkspacesController);
adminRouter.patch('/workspaces/:workspaceId', updateAdminWorkspaceController);
adminRouter.delete('/workspaces/:workspaceId', deleteAdminWorkspaceController);
adminRouter.get('/messages', listAdminMessagesController);
adminRouter.delete('/messages/:messageId', deleteAdminMessageController);
adminRouter.get('/payments', listAdminPaymentsController);
adminRouter.get('/audit-logs', listAdminAuditLogsController);

export default adminRouter;
