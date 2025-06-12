import type { Context, Next } from "hono";
import type { User } from "./types";

export async function authMiddleware(c: Context, next: Next) {
  // TODO: Implement JWT validation
  // For now, just continue
  await next();
}

export function getCurrentUser(_c: Context): User | null {
  // TODO: Extract user from JWT token
  return null;
}
