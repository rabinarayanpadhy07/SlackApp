import express from 'express';

import adminRouter from './admin.js';
import channelRouter from './channel.js';
import draftsRouter from './drafts.js';
import memberRouter from './members.js';
import messageRouter from './messages.js';
import paymentRouter from './payment.js';
import searchRouter from './search.js';
import threadsRouter from './threads.js';
import userRouter from './users.js';
import workspaceRouter from './workspaces.js';

const router = express.Router();

router.use('/users', userRouter);

router.use('/admin', adminRouter);

router.use('/workspaces', workspaceRouter);

router.use('/channels', channelRouter);

router.use('/members', memberRouter);

router.use('/messages', messageRouter);

router.use('/payments', paymentRouter);

router.use('/', threadsRouter);

router.use('/', draftsRouter);

router.use('/search', searchRouter);

export default router;
