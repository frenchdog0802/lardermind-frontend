const GUEST_TOKEN_KEY = 'lardermind.guest_token';

export function readGuestToken(): string | null {
  try {
    return sessionStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeGuestToken(token: string): void {
  try {
    sessionStorage.setItem(GUEST_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearGuestToken(): void {
  try {
    sessionStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Consume guest token once for claim-on-signup (returns and clears). */
export function takeGuestToken(): string | null {
  const token = readGuestToken();
  if (token) clearGuestToken();
  return token;
}
