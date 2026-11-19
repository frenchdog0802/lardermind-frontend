import React, { useState } from 'react';
import { ChefHatIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/authContext';
import { Loading } from './Loading';
import { GoogleSignInButton } from './GoogleSignInButton';

interface LoginProps {
  onLoginSuccess: () => void;
  onSignUp: () => void;
  onForgotPassword?: () => void;
}

export function Login({ onSignUp, onLoginSuccess, onForgotPassword }: LoginProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, redirectError, clearRedirectError } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  React.useEffect(() => {
    if (redirectError) {
      setError(redirectError);
      clearRedirectError();
    }
  }, [redirectError, clearRedirectError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.message || t('auth.invalidCredentials'));
      }
    } catch {
      setError(t('auth.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-linen">
      <div className="flex-1 overflow-y-auto pb-20 lg:pb-6">
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 lg:py-24">
          <div className="w-full max-w-md animate-fade-up">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-herb mb-4">
                <ChefHatIcon size={24} className="text-white" />
              </div>
              <h1 className="font-display text-4xl font-semibold text-ink">LarderMind</h1>
              <p className="text-muted mt-2">{t('auth.signInTitle')}</p>
            </div>

            {isSubmitting ? (
              <Loading />
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {error && (
                    <div role="alert" className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                      {error}
                    </div>
                  )}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-ink mb-1">
                      {t('auth.email')}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="input-field"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-ink mb-1">
                      {t('auth.password')}
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-field"
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-herb border-line rounded focus:ring-herb"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-sm text-muted">
                        {t('auth.rememberMe')}
                      </label>
                    </div>
                    <a
                      href="/forgot-password"
                      onClick={(e) => {
                        if (!onForgotPassword) return;
                        e.preventDefault();
                        onForgotPassword();
                      }}
                      className="text-sm text-herb hover:text-herb-deep"
                    >
                      {t('auth.forgotPassword')}
                    </a>
                  </div>
                  <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                    {t('auth.signIn')}
                  </button>
                </form>

                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-linen text-muted">{t('common.or')}</span>
                  </div>
                </div>

                <GoogleSignInButton
                  text="signin_with"
                  onError={() => setError(t('auth.googleCancelled'))}
                />

                <div className="text-center text-sm text-muted mt-8">
                  {t('auth.noAccount')}{' '}
                  <button onClick={onSignUp} className="text-herb hover:text-herb-deep font-medium">
                    {t('auth.signUp')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
