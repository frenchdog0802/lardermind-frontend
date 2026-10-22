import React, { useEffect, useState, createContext, useContext } from 'react';
import { auth, claimGuestKitchenIfPresent } from '../api/api-auth.ts';
import { authHelper } from '../api/auth-helper.ts';
import { ApiResponse, User, } from '../api/types.ts';
import { clearGuestToken } from '../utils/guestSession';

export interface AuthResponse {
  success: boolean;
  message?: string;
}
interface AuthContextType {
  user: User | null;
  /** True only while restoring session from storage on app boot. */
  initializing: boolean;
  /** Set when mobile Google redirect callback fails. */
  redirectError: string | null;
  clearRedirectError: () => void;
  signUp: (user: User, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  googleLogin: (googleAccessToken: string) => Promise<AuthResponse>;
  logout: () => void;
  isAuthenticated: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Decode Base64URL JSON that was UTF-8 encoded (atob alone mangles Chinese). */
function decodeBase64UrlJson<T>(encoded: string): T {
  const padded = encoded + '='.repeat((4 - (encoded.length % 4)) % 4);
  const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const json = new TextDecoder('utf-8').decode(bytes);
  return JSON.parse(json) as T;
}

/** Complete Google redirect login when returning from /api/auth/google-callback. */
function consumeGoogleRedirectAuth(): { user: User; token: string } | { error: string } | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  if (hash.startsWith('#google_auth_error=')) {
    const msg = decodeURIComponent(hash.slice('#google_auth_error='.length));
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return { error: msg || 'Google login failed' };
  }
  if (!hash.startsWith('#google_auth=')) return null;

  try {
    const encoded = hash.slice('#google_auth='.length);
    const payload = decodeBase64UrlJson<{ token: string; user: User }>(encoded);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    if (!payload?.token || !payload?.user) {
      return { error: 'Google login failed' };
    }
    return { token: payload.token, user: payload.user };
  } catch (e) {
    console.error('Failed to parse Google redirect payload', e);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return { error: 'Google login failed' };
  }
}

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children
}) => {
    const [user, setUser] = useState<User | null>(null);
    const [initializing, setInitializing] = useState(true);
    const [redirectError, setRedirectError] = useState<string | null>(null);

    useEffect(() => {
      const checkAuth = () => {
        try {
          const redirected = consumeGoogleRedirectAuth();
          if (redirected && 'error' in redirected) {
            setRedirectError(redirected.error);
          } else if (redirected && 'token' in redirected) {
            authHelper.authenticate(redirected.token);
            setUser(redirected.user);
            localStorage.setItem('user', JSON.stringify(redirected.user));
            void claimGuestKitchenIfPresent();
            setInitializing(false);
            return;
          }

          const storedUser = localStorage.getItem('user');
          const jwttoken = authHelper.getJWT();
          if (storedUser && jwttoken) {
            const parsedUser = JSON.parse(storedUser) as User;
            if (parsedUser && parsedUser.name && parsedUser.id) {
              setUser(parsedUser);
            } else {
              console.warn('Incomplete user data, clearing...');
              localStorage.removeItem('user');
            }
          }
        } catch (error) {
          console.error('Auth check error:', error);
          localStorage.removeItem('user');
        } finally {
          setInitializing(false);
        }
      };

      checkAuth();
    }, []);

    const signUp = async (user: User, password: string): Promise<ApiResponse> => {
      const authResponse: ApiResponse = { success: false };
      try {
        const response = await auth.signup(user, password);

        if (response && response.success && response.data) {
          const createdUser = response.data?.user as User;
          setUser(createdUser);
          localStorage.setItem('user', JSON.stringify(createdUser));
          authHelper.authenticate(response.data?.token);
          clearGuestToken();
          authResponse.success = true;
        } else {
          authResponse.success = false;
          authResponse.message = response.message || 'Sign up failed';
        }
      } catch (error) {
        console.error('Error during sign up:', error);
        authResponse.message = 'Unable to reach the server. Make sure the backend is running.';
      }
      return authResponse;
    };
    const login = async (email: string, password: string): Promise<AuthResponse> => {
      const authResponse: AuthResponse = { success: false };
      try {
        const response = await auth.signin(email, password);
        if (response && response.data && response.success) {
          authHelper.authenticate(response.data.token);
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          clearGuestToken();
          authResponse.success = true;
        } else {
          authResponse.success = false;
          authResponse.message = response.message || 'Login failed';
        }
      } catch (error) {
        console.error('Error logging in:', error);
        authResponse.message = 'Unable to reach the server. Make sure the backend is running.';
      }
      return authResponse;
    };

    const googleLogin = async (googleAccessToken: string): Promise<AuthResponse> => {
      const authResponse: AuthResponse = { success: false };
      try {
        const response = await auth.googleLogin(googleAccessToken);
        if (response && response.data && response.success) {
          authHelper.authenticate(response.data.token);
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          clearGuestToken();
          authResponse.success = true;
        } else {
          authResponse.success = false;
          authResponse.message = response.message || 'Google login failed';
        }
      } catch (error) {
        console.error('Error during Google login:', error);
        authResponse.message = 'Unable to reach the server. Make sure the backend is running.';
      }
      return authResponse;
    };

    const logout = () => {
      setUser(null);
      authHelper.clearJWT();
      localStorage.removeItem('user');
    };

    const value = {
      user,
      initializing,
      redirectError,
      clearRedirectError: () => setRedirectError(null),
      login,
      googleLogin,
      logout,
      isAuthenticated: !!user,
      signUp,
    };
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };


export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
