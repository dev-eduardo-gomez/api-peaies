export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  enabled: boolean;
  locked: boolean;
  failedLoginAttempts: number;
  lastLoginAt: Date | null;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRequest {
  user: {
    userId: string;
    roles: string[];
  };
}
