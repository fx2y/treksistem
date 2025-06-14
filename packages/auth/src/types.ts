export interface JwtPayload {
  userId: string;
  exp: number;
  iat: number;
  [key: string]: unknown;
}

export interface AuthenticatedUserProfile {
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
  roles: {
    isMitra: boolean;
    mitraId: string | null;
    isDriver: boolean;
    driverForMitras: Array<{
      mitraId: string;
      businessName: string;
    }>;
    isAdmin: boolean;
  };
  mitra?: {
    id: string;
    businessName: string;
    hasCompletedOnboarding: boolean;
    activeDriverLimit: number;
  };
}
