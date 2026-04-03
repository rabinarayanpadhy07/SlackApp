import express from 'express';
import passport from 'passport';

import { FRONTEND_URL } from '../../config/serverConfig.js';
import {
  forgotPassword,
  googleAuthSuccess,
  resetPassword,
  setup2FA,
  signIn,
  signUp,
  verify2FA
} from '../../controllers/userController.js';
import { isAuthenticated } from '../../middlewares/authMiddleware.js';
import { createRateLimiter } from '../../middlewares/rateLimitMiddleware.js';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  userSignInSchema,
  userSignUpSchema
} from '../../validators/userSchema.js';
import { validate } from '../../validators/zodValidator.js';

const router = express.Router();
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts',
  keyPrefix: 'auth'
});

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

router.post('/signup', authRateLimiter, validate(userSignUpSchema), signUp);
router.post('/signin', authRateLimiter, validate(userSignInSchema), signIn);
router.post(
  '/forgot-password',
  authRateLimiter,
  validate(forgotPasswordSchema),
  forgotPassword
);
router.post(
  '/reset-password',
  authRateLimiter,
  validate(resetPasswordSchema),
  resetPassword
);
router.post('/2fa/setup', isAuthenticated, setup2FA);
router.post('/2fa/verify', authRateLimiter, verify2FA);

// Google Auth Routes
router.get('/google', (req, res, next) => {
  authRateLimiter(req, res, () => {
    const frontendOrigin = resolveFrontendOrigin(req.query.origin);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: frontendOrigin
    })(req, res, next);
  });
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
