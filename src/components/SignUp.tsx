import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChefHatIcon } from 'lucide-react';
import { useAuth } from '../contexts/authContext';
import { Loading } from './Loading';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from '../api/types.ts';

interface SignUpProps {
  onSignUpSuccess: () => void;
  onLogin: () => void;
}

export function SignUp({ onSignUpSuccess, onLogin }: SignUpProps) {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, redirectError, clearRedirectError } = useAuth();

  React.useEffect(() => {
    if (redirectError) {
      setError(redirectError);
      clearRedirectError();
    }
  }, [redirectError, clearRedirectError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const user = { first_name: firstName, last_name: lastName, email, name: `${firstName} ${lastName}` } as User;
      const response = await signUp(user, password);
      if (response.success) {
        onSignUpSuccess();
      } else {
        setError(response.message || t('auth.signUpFailed'));
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
              <p className="text-muted mt-2">{t('auth.signUpTitle')}</p>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-ink mb-1">
                        {t('auth.firstName')}
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        className="input-field"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-ink mb-1">
                        {t('auth.lastName')}
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        className="input-field"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
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
                      minLength={8}
                      required
                    />
                    <p className="mt-1.5 text-xs text-muted">{t('auth.passwordRules')}</p>
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink mb-1">
                      {t('auth.confirmPassword')}
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="input-field"
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary w-full">
                    {t('auth.signUp')}
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
                  text="signup_with"
                  onError={() => setError(t('auth.googleSignUpCancelled'))}
                />

                <div className="text-center text-sm text-muted mt-8">
                  {t('auth.haveAccount')}{' '}
                  <button onClick={onLogin} className="text-herb hover:text-herb-deep font-medium">
                    {t('auth.logIn')}
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
