import express from 'express';
import passport from 'passport';

import { FRONTEND_URL } from '../../config/serverConfig.js';
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

const resolveFrontendOrigin = (rawOrigin) => {
  if (!rawOrigin) {
    return FRONTEND_URL;
  }

  try {
    const parsedOrigin = new URL(rawOrigin);
    if (!['http:', 'https:'].includes(parsedOrigin.protocol)) {
      return FRONTEND_URL;
    }
    return parsedOrigin.origin;
  } catch {
    return FRONTEND_URL;
  }
};

router.post('/signup', validate(userSignUpSchema), signUp);
router.post('/signin', validate(userSignInSchema), signIn);
router.post('/2fa/setup', isAuthenticated, setup2FA);
router.post('/2fa/verify', verify2FA);

// Google Auth Routes
router.get('/google', (req, res, next) => {
  const frontendOrigin = resolveFrontendOrigin(req.query.origin);
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
    state: frontendOrigin
  })(req, res, next);
});

router.get(
  '/google/callback',
  (req, res, next) => {
    const frontendOrigin = resolveFrontendOrigin(req.query.state);
    passport.authenticate('google', { session: false }, (error, user) => {
      if (error || !user) {
        return res.redirect(`${frontendOrigin}/auth/signin?error=auth_failed`);
      }

      req.user = user;
      return next();
    })(req, res, next);
  },
  googleAuthSuccess
);

export default router;
