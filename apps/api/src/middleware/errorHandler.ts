import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
    return;
  }

  // Mongoose CastError — invalid ObjectId in a route param
  if ((err as { name?: string }).name === 'CastError') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const status = (err as { status?: number }).status ?? 500;
  const message =
    err instanceof Error ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
