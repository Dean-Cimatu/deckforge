import { z } from 'zod';

// ── Auth schemas ─────────────────────────────────────────────────────────────

export const RegisterInput = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthUser = z.object({
  id: z.string(),
  email: z.string().email(),
});

export type RegisterInput = z.infer<typeof RegisterInput>;
export type LoginInput = z.infer<typeof LoginInput>;
export type AuthUser = z.infer<typeof AuthUser>;
