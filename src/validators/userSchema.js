import { z } from 'zod';

export const userSignUpSchema = z.object({
  email: z.string().trim().email(),
  username: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-zA-Z0-9]+$/, 'Username must contain only letters and numbers'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(/\d/, 'Password must include at least one number')
});

export const userSignInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string()
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email()
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(/\d/, 'Password must include at least one number')
});
