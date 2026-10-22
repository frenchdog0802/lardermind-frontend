// src/api/Api-auth.ts
import { api } from './client';
import type { ApiResponse, User } from './types';
import { clearGuestToken, readGuestToken } from '../utils/guestSession';

export interface SignupResponse {
  user: User;
  token: string;
  claimed?: boolean;
}

export interface SigninResponse {
  user: User;
  token: string;
  claimed?: boolean;
}

export interface GoogleLoginResponse {
  user: User;
  token: string;
  claimed?: boolean;
}

export interface GuestMintResponse {
  token: string;
  user: User & { is_guest?: boolean; expires_at?: number | null };
  expires_in: number;
}

function withGuestToken<T extends Record<string, unknown>>(body: T): T & { guest_token?: string } {
  const guestToken = readGuestToken();
  return guestToken ? { ...body, guest_token: guestToken } : body;
}

export const auth = {
  signup: (user: User, password: string) =>
    api.post<SignupResponse>(
      '/api/auth/signup',
      withGuestToken({ ...user, password }),
    ),
  signin: (email: string, password: string) =>
    api.post<SigninResponse>(
      '/api/auth/signin',
      withGuestToken({ email, password }),
    ),
  signout: () => api.get<ApiResponse>('/api/auth/signout'),
  /** Exchange a Google ID token (GIS credential JWT) for an app JWT. */
  googleLogin: (token: string) =>
    api.post<GoogleLoginResponse>(
      '/api/auth/google-login',
      withGuestToken({ token }),
    ),
  mintGuest: () => api.post<GuestMintResponse>('/api/auth/guest', {}),
  claimGuest: (guestToken: string) =>
    api.post<{ claimed: boolean }>('/api/auth/claim-guest', {
      guest_token: guestToken,
    }),
};

/** After real auth, claim guest kitchen if a guest token remains (e.g. Google redirect). */
export async function claimGuestKitchenIfPresent(): Promise<void> {
  const guestToken = readGuestToken();
  if (!guestToken) return;
  try {
    const response = await auth.claimGuest(guestToken);
    if (response.success) {
      clearGuestToken();
    }
  } catch {
    /* leave token for retry */
  }
}
