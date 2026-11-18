import React, { useState } from 'react';
import { ChefHatIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../api/api-auth';

/** Same rule as signup (backend: zod min 8 / max 256). */
export const MIN_PASSWORD_LENGTH = 8;

function AuthShell({ title, subtitle, children }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full min-h-screen bg-linen">
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 lg:py-24">
        <div className="w-full max-w-md animate-fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-herb mb-4">
              <ChefHatIcon size={24} className="text-white" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
            {subtitle ? <p className="text-muted mt-2">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: 'info' | 'error'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={
        tone === 'error'
          ? 'bg-sage/60 text-herb-deep p-3 rounded-lg text-sm border border-line'
          : 'bg-sage/30 text-ink p-3 rounded-lg text-sm border border-herb'
      }
    >
      {children}
    </div>
  );
}

export function ForgotPassword({ onBackToLogin }: { onBackToLogin: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await auth.requestPasswordReset(email.trim());
      if (res.statusCode === 429) {
        setError(t('auth.tooManyAttempts'));
      } else if (res.success) {
        setSent(true);
      } else {
        setError(t('auth.genericError'));
      }
    } catch {
      setError(t('auth.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={sent ? undefined : t('auth.forgotSubtitle')}>
      {sent ? (
        <div className="space-y-5">
          <Notice tone="info">{t('auth.resetRequestSent')}</Notice>
          <p className="text-sm text-muted">{t('auth.googleAccountHint')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-ink mb-1">
              {t('auth.email')}
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? t('common.loading') : t('auth.sendResetLink')}
          </button>
        </form>
      )}
      <div className="text-center text-sm text-muted mt-8">
        <button type="button" onClick={onBackToLogin} className="text-herb hover:text-herb-deep font-medium">
          {t('auth.backToLogin')}
        </button>
      </div>
    </AuthShell>
  );
}

export function ResetPassword({
  token,
  onBackToLogin,
  onRequestNewLink,
}: {
  token: string;
  onBackToLogin: () => void;
  onRequestNewLink: () => void;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [invalidLink, setInvalidLink] = useState(!token);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordRules'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordsMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await auth.confirmPasswordReset(token, password);
      if (res.success) {
        setDone(true);
      } else if (res.code === 'reset_token_invalid') {
        setInvalidLink(true);
      } else if (res.statusCode === 429) {
        setError(t('auth.tooManyAttempts'));
      } else {
        setError(res.message || t('auth.genericError'));
      }
    } catch {
      setError(t('auth.genericError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (invalidLink) {
    return (
      <AuthShell title={t('auth.resetTitle')}>
        <div className="space-y-5">
          <Notice tone="error">{t('auth.resetInvalidLink')}</Notice>
          <button type="button" onClick={onRequestNewLink} className="btn-primary w-full">
            {t('auth.requestNewLink')}
          </button>
        </div>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title={t('auth.resetTitle')}>
        <div className="space-y-5">
          <Notice tone="info">{t('auth.resetSuccess')}</Notice>
          <button type="button" onClick={onBackToLogin} className="btn-primary w-full">
            {t('auth.signIn')}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.resetTitle')}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-ink mb-1">
            {t('auth.newPassword')}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            required
          />
          <p className="mt-1 text-xs text-muted">{t('auth.passwordRules')}</p>
        </div>
        <div>
          <label htmlFor="confirm-new-password" className="block text-sm font-medium text-ink mb-1">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="confirm-new-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t('common.loading') : t('auth.setNewPassword')}
        </button>
      </form>
      <div className="text-center text-sm text-muted mt-8">
        <button type="button" onClick={onBackToLogin} className="text-herb hover:text-herb-deep font-medium">
          {t('auth.backToLogin')}
        </button>
      </div>
    </AuthShell>
  );
}
