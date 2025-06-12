export interface User {
  id: string;
  email: string;
  name: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  exp: number;
}