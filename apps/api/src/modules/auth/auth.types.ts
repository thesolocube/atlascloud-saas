export interface JwtPayload {
  sub: string;
  email: string;
  isPlatformAdmin: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  isPlatformAdmin: boolean;
}
