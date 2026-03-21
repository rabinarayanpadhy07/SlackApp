import express from 'express';
import passport from 'passport';

import { googleAuthSuccess,signIn, signUp } from '../../controllers/userController.js';
import {
  userSignInSchema,
  userSignUpSchema
} from '../../validators/userSchema.js';
import { validate } from '../../validators/zodValidator.js';

const router = express.Router();

router.post('/signup', validate(userSignUpSchema), signUp);
router.post('/signin', validate(userSignInSchema), signIn);

// Google Auth Routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/signin', session: false }),
  googleAuthSuccess
);

export default router;