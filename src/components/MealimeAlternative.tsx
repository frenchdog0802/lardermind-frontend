import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GuestChatBox } from './GuestChatBox';

interface MealimeAlternativeProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const BULLET_KEYS = [1, 2, 3, 4, 5] as const;

/** Keeps the localized title/description in sync client-side (the static HTML ships English). */
function useDocumentHead(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content') ?? null;
    document.title = title;
    meta?.setAttribute('content', description);
    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== null) meta.setAttribute('content', prevDescription);
    };
  }, [title, description]);
}

export function MealimeAlternative({ onGetStarted, onLogin }: MealimeAlternativeProps) {
  const { t } = useTranslation();
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);
  const chatRef = useRef<HTMLElement>(null);

  useDocumentHead(t('mealime.metaTitle'), t('mealime.metaDescription'));

  const openChat = () => {
    setPrefill((prev) => ({ text: t('mealime.starterPrompt'), nonce: (prev?.nonce ?? 0) + 1 }));
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-linen text-ink">
      <nav className="flex w-full items-center justify-between border-b border-line bg-linen/90 px-[5%] py-4">
        <a href="/" className="font-display text-xl font-semibold text-ink">
          LarderMind
        </a>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <button type="button" onClick={onLogin} className="btn-secondary text-sm">
            {t('mealime.login')}
          </button>
        </div>
      </nav>

      <main>
        <header className="mx-auto max-w-3xl px-[5%] pb-10 pt-16 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-herb">
            {t('mealime.eyebrow')}
          </p>
          <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3rem)] font-semibold leading-tight text-ink">
            {t('mealime.title')}
          </h1>
          <p className="mt-4 text-lg text-muted">{t('mealime.lead')}</p>
          <button type="button" onClick={openChat} className="btn-primary mt-8">
            {t('mealime.ctaButton')}
          </button>
          <p className="mt-3 text-sm text-muted">{t('mealime.ctaHint')}</p>
        </header>

        <section className="mx-auto max-w-2xl px-[5%] py-8">
          <h2 className="font-display text-2xl font-semibold text-ink">{t('mealime.whatTitle')}</h2>
          <p className="mt-3 text-muted">{t('mealime.whatBody')}</p>
        </section>

        <section className="mx-auto max-w-2xl px-[5%] py-8">
          <h2 className="font-display text-2xl font-semibold text-ink">{t('mealime.howTitle')}</h2>
          <ul className="mt-4 space-y-3">
            {BULLET_KEYS.map((n) => (
              <li key={n} className="flex gap-3 text-ink">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-herb" aria-hidden="true" />
                <span>{t(`mealime.bullet${n}`)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section ref={chatRef} id="try-chat" className="mx-auto max-w-2xl px-[5%] py-8">
          <h2 className="mb-4 font-display text-2xl font-semibold text-ink">{t('mealime.chatTitle')}</h2>
          <GuestChatBox onGetStarted={onGetStarted} showHeader={false} size="large" prefill={prefill} />
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={onGetStarted} className="btn-primary">
              {t('mealime.signUp')}
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-[5%] py-8">
        <p className="mx-auto max-w-2xl text-sm text-muted">{t('mealime.disclaimer')}</p>
        <p className="mx-auto mt-3 max-w-2xl text-sm">
          <a href="/" className="text-herb hover:underline">
            {t('mealime.back')}
          </a>
        </p>
      </footer>
    </div>
  );
}
