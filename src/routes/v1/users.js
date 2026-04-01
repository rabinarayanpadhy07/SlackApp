import express from 'express';
import passport from 'passport';

import {
  googleAuthSuccess,
  setup2FA,
  signIn,
  signUp,
  verify2FA
} from '../../controllers/userController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';
import {
  userSignInSchema,
  userSignUpSchema
} from '../../validators/userSchema.js';
import { validate } from '../../validators/zodValidator.js';

const router = express.Router();

router.post('/signup', validate(userSignUpSchema), signUp);
router.post('/signin', validate(userSignInSchema), signIn);
router.post('/2fa/setup', isAuthenticated, setup2FA);
router.post('/2fa/verify', verify2FA);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/signin', session: false }),
  googleAuthSuccess
);

export default router;