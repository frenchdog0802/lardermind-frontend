import { useEffect, useRef } from 'react';
import { useGoogleOAuth } from '@react-oauth/google';

/** Backend URL Google POSTs the ID token to (redirect UX). */
export function googleCallbackUri(): string {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  const base = configured && configured.length > 0 ? configured : window.location.origin;
  return `${base}/api/auth/google-callback`;
}

type GoogleSignInButtonProps = {
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  /** Unused for redirect UX; kept so Login/SignUp call sites stay simple. */
  onCredential?: unknown;
  onError?: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

/**
 * Sign in with Google via full-page redirect.
 *
 * Important: @react-oauth/google's <GoogleLogin> always registers a JS `callback`,
 * and Google docs say callback wins over login_uri — so redirect never runs and
 * mobile often breaks. We initialize GIS ourselves without a callback.
 */
export function GoogleSignInButton({ text = 'signin_with', onError }: GoogleSignInButtonProps) {
  const btnRef = useRef<HTMLDivElement>(null);
  const { clientId, scriptLoadedSuccessfully } = useGoogleOAuth();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!scriptLoadedSuccessfully || !clientId || !btnRef.current) return;
    if (!window.google?.accounts?.id) {
      onErrorRef.current?.();
      return;
    }

    try {
      // No `callback` here — required for login_uri redirect to be used.
      window.google.accounts.id.initialize({
        client_id: clientId,
        ux_mode: 'redirect',
        login_uri: googleCallbackUri(),
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'rectangular',
        width: 384,
      });
    } catch (e) {
      console.error('Failed to render Google button', e);
      onErrorRef.current?.();
    }
  }, [scriptLoadedSuccessfully, clientId, text]);

  return <div ref={btnRef} className="flex justify-center w-full min-h-10" />;
}
