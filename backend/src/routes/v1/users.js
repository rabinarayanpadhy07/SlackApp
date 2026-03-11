import express from 'express';

import { googleAuth, signIn, signUp } from '../../controllers/userController.js';
import {
  googleAuthSchema,
  userSignInSchema,
  userSignUpSchema
} from '../../validators/userSchema.js';
import { validate } from '../../validators/zodValidator.js';

const router = express.Router();

router.post('/signup', validate(userSignUpSchema), signUp);
router.post('/signin', validate(userSignInSchema), signIn);
router.post('/google', validate(googleAuthSchema), googleAuth);

export default router;