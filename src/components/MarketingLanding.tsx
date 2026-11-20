import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CameraIcon } from 'lucide-react';
import { HERO_IMAGE } from '../remotion/heroConstants';
import { LanguageSwitcher } from './LanguageSwitcher';
import { GuestChatBox } from './GuestChatBox';
import { PricingSection } from './PricingSection';
import { ProductPreviewMock } from './ProductPreviewMock';
import { SampleWeek } from './SampleWeek';

// The Remotion runtime is heavy; the static <img> below paints first, the Player loads after.
const HeroPlayer = lazy(() => import('../remotion/HeroPlayer'));

interface MarketingLandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const FAQ_KEYS = [1, 2, 3, 4] as const;

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const onChange = () => setPrefersReduced(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return prefersReduced;
}

function RevealOnScroll({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Above-the-fold hero. A plain eager, high-priority <img> is always painted first so the
 * hero is never blank while the Remotion Player measures its container / buffers its
 * own <Img>; the animated Player (when motion is allowed) is layered on top of it.
 */
function HeroVisual({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  return (
    <>
      <img
        src={HERO_IMAGE}
        alt=""
        loading="eager"
        decoding="async"
        // React 18 has no camelCase fetchPriority prop; pass the raw attribute.
        {...{ fetchpriority: 'high' }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(243, 240, 232, 0.88) 0%, rgba(243, 240, 232, 0.45) 55%, rgba(243, 240, 232, 0.12) 100%)',
        }}
      />
      {!prefersReducedMotion && (
        <Suspense fallback={null}>
          <HeroPlayer />
        </Suspense>
      )}
    </>
  );
}

export function MarketingLanding({ onGetStarted, onLogin }: MarketingLandingProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null);

  const tryWithFridge = (text: string) => {
    setPrefill((prev) => ({ text, nonce: (prev?.nonce ?? 0) + 1 }));
    document
      .getElementById('demo-chat')
      ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-linen text-ink">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-line bg-linen/90 px-[5%] py-4 backdrop-blur-md">
        <span className="font-display text-xl font-semibold text-ink">LarderMind</span>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-sm text-muted hover:text-ink">
            {t('landing.nav.pricing')}
          </a>
          <a href="#faq" className="text-sm text-muted hover:text-ink">
            {t('landing.nav.faq')}
          </a>
          <LanguageSwitcher />
          <button type="button" onClick={onLogin} className="btn-secondary text-sm">
            {t('landing.nav.login')}
          </button>
        </div>
      </nav>

      <header className="relative flex min-h-screen flex-col justify-end overflow-hidden">
        <div className="absolute inset-0" aria-hidden="true">
          <HeroVisual prefersReducedMotion={prefersReducedMotion} />
        </div>

        <div className="relative z-10 w-full max-w-[720px] animate-fade-up px-[5%] pb-16 pt-28">
          <p className="font-display text-[clamp(2.5rem,8vw,4rem)] font-semibold leading-[1.05] tracking-tight text-ink">
            LarderMind
          </p>
          <h1 className="mt-3 max-w-xl font-display text-[clamp(1.5rem,4vw,2rem)] font-medium leading-tight text-ink">
            {t('landing.hero.tagline')}
          </h1>
          <div className="mt-8 flex flex-wrap gap-4">
            <button type="button" onClick={onGetStarted} className="btn-primary">
              {t('landing.hero.signUp')}
            </button>
            <button type="button" onClick={onLogin} className="btn-secondary px-6 py-3">
              {t('landing.hero.login')}
            </button>
          </div>
          <p className="mt-4 text-sm text-muted">{t('landing.hero.platforms')}</p>
        </div>
      </header>

      <SampleWeek onTry={tryWithFridge} />

      <section id="demo-chat" className="border-t border-line bg-surface/60 px-[5%] py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <RevealOnScroll>
            <p className="text-sm font-semibold uppercase tracking-widest text-herb">
              {t('landing.demo.eyebrow')}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              {t('landing.demo.title')}
            </h2>
            <p className="mt-4 text-lg text-muted">
              {t('landing.demo.body')}
            </p>
            <ul className="mt-8 space-y-4">
              {[
                t('landing.demo.bullet1'),
                t('landing.demo.bullet2'),
                t('landing.demo.bullet3'),
              ].map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-herb" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onGetStarted} className="btn-primary mt-10">
              {t('landing.hero.signUp')}
            </button>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-sage/30 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="mb-3 flex items-center justify-end">
                  <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
                    {t('landing.demo.liveTry')}
                  </span>
                </div>
                <GuestChatBox
                  onGetStarted={onGetStarted}
                  showHeader={false}
                  size="large"
                  prefill={prefill}
                />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <ProductPreviewMock />

      <section className="px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              {t('landing.struggle.title')}
            </h2>
            <p className="mt-3 text-lg text-muted">
              {t('landing.struggle.subtitle')}
            </p>
          </div>
        </RevealOnScroll>

        <ul className="mx-auto max-w-2xl divide-y divide-line">
          {[1, 2, 3, 4].map((n) => ({
            title: t(`landing.struggle.item${n}Title`),
            body: t(`landing.struggle.item${n}Body`),
          })).map((item) => (
            <RevealOnScroll key={item.title}>
              <li className="py-6">
                <strong className="block font-semibold text-ink">{item.title}</strong>
                <span className="mt-1 block text-muted">{item.body}</span>
              </li>
            </RevealOnScroll>
          ))}
        </ul>
      </section>

      <section id="features" className="px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              {t('landing.how.title')}
            </h2>
          </div>
        </RevealOnScroll>

        <div className="mx-auto flex max-w-5xl flex-col gap-20">
          <RevealOnScroll>
            <p
              data-testid="landing-photo-line"
              className="mx-auto flex max-w-2xl items-center justify-center gap-3 rounded-2xl border border-line bg-sage/30 px-5 py-4 text-center text-lg font-medium text-ink"
            >
              <CameraIcon size={24} className="shrink-0 text-herb" aria-hidden="true" />
              <span>{t('landing.how.photoLine')}</span>
            </p>
          </RevealOnScroll>
          {[
            {
              step: '01',
              title: t('landing.how.step1Title'),
              body: t('landing.how.step1Body'),
              image:
                'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
              alt: t('landing.how.step1Alt'),
              reverse: false,
            },
            {
              step: '02',
              title: t('landing.how.step2Title'),
              body: t('landing.how.step2Body'),
              image:
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
              alt: t('landing.how.step2Alt'),
              reverse: true,
            },
            {
              step: '03',
              title: t('landing.how.step3Title'),
              body: t('landing.how.step3Body'),
              image:
                'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
              alt: t('landing.how.step3Alt'),
              reverse: false,
            },
          ].map((feature) => (
            <RevealOnScroll key={feature.step}>
              <div
                className={`flex flex-col items-center gap-10 lg:flex-row ${
                  feature.reverse ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className="flex-1">
                  <span className="text-sm font-semibold tracking-widest text-herb">
                    {feature.step}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-muted">{feature.body}</p>
                </div>
                <div className="aspect-[4/3] w-full flex-1 overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <PricingSection onGetStarted={onGetStarted} />

      <section id="faq" className="border-t border-line px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              {t('landing.faq.title')}
            </h2>
            <p className="mt-3 text-lg text-muted">
              {t('landing.faq.subtitle')}
            </p>
          </div>
        </RevealOnScroll>

        <dl className="mx-auto max-w-2xl divide-y divide-line">
          {FAQ_KEYS.map((n) => (
            <RevealOnScroll key={n}>
              <div className="py-6">
                <dt className="font-semibold text-ink">{t(`landing.faq.q${n}`)}</dt>
                <dd className="mt-2 text-muted">{t(`landing.faq.a${n}`)}</dd>
              </div>
            </RevealOnScroll>
          ))}
        </dl>
      </section>

      <section id="join" className="border-t border-line px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              {t('landing.join.title')}
            </h2>
            <p className="mt-3 text-lg text-muted">
              {t('landing.join.body')}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={onGetStarted} className="btn-primary">
                {t('landing.hero.signUp')}
              </button>
              <button type="button" onClick={onLogin} className="btn-secondary px-6 py-3">
                {t('landing.hero.login')}
              </button>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <footer className="border-t border-line px-[5%] py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <span className="font-display text-xl font-semibold text-ink">LarderMind</span>
          <ul className="flex gap-6 text-sm text-muted">
            <li>
              <a href="/legal/privacy-policy.html" className="hover:text-ink">
                {t('landing.footer.privacy')}
              </a>
            </li>
            <li>
              <a href="/legal/terms-of-service.html" className="hover:text-ink">
                {t('landing.footer.terms')}
              </a>
            </li>
            <li>
              <a href="/mealime-alternative" className="hover:text-ink">
                {t('landing.footer.mealime')}
              </a>
            </li>
            <li>
              <a href="mailto:support@lardermind.com" className="hover:text-ink">
                {t('landing.footer.contact')}
              </a>
            </li>
          </ul>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-sm text-muted">
          {t('landing.footer.copyright')}
        </p>
      </footer>
    </div>
  );
}
