import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Player } from '@remotion/player';
import {
  HeroScene,
  HERO_DURATION_FRAMES,
  HERO_FPS,
  HERO_HEIGHT,
  HERO_IMAGE,
  HERO_WIDTH,
} from '../remotion/HeroScene';
import { DemoChatBox } from './DemoChatBox';
import { PricingSection } from './PricingSection';

interface MarketingLandingProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

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

function HeroVisual({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  if (prefersReducedMotion) {
    return (
      <>
        <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(243, 240, 232, 0.88) 0%, rgba(243, 240, 232, 0.45) 55%, rgba(243, 240, 232, 0.12) 100%)',
          }}
        />
      </>
    );
  }

  return (
    <Player
      component={HeroScene}
      durationInFrames={HERO_DURATION_FRAMES}
      compositionWidth={HERO_WIDTH}
      compositionHeight={HERO_HEIGHT}
      fps={HERO_FPS}
      loop
      autoPlay
      acknowledgeRemotionLicense
      style={{ width: '100%', height: '100%' }}
    />
  );
}

export function MarketingLanding({ onGetStarted, onLogin }: MarketingLandingProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="min-h-screen bg-linen text-ink">
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-line bg-linen/90 px-[5%] py-4 backdrop-blur-md">
        <span className="font-display text-xl font-semibold text-ink">LarderMind</span>
        <div className="flex items-center gap-4">
          <a href="#pricing" className="text-sm text-muted hover:text-ink">
            Pricing
          </a>
          <button type="button" onClick={onLogin} className="btn-secondary text-sm">
            Log in
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
            An AI assistant that plans your meals from what&apos;s in your pantry.
          </h1>
          <div className="mt-8 flex flex-wrap gap-4">
            <button type="button" onClick={onGetStarted} className="btn-primary">
              Get started
            </button>
            <button type="button" onClick={onLogin} className="btn-secondary px-6 py-3">
              Log in
            </button>
          </div>
        </div>
      </header>

      <section id="demo-chat" className="border-t border-line bg-surface/60 px-[5%] py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center">
          <RevealOnScroll>
            <p className="text-sm font-semibold uppercase tracking-widest text-herb">
              See it in action
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              Just ask — LarderMind handles the rest
            </h2>
            <p className="mt-4 text-lg text-muted">
              Talk to your kitchen in plain English. Plan meals, update your pantry, build grocery
              lists, and import recipes — the same chat you use every day in the app.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Ask what you can cook with what\'s already in your fridge',
                'Plan a week of dinners that respect allergies and picky eaters',
                'Add ingredients or import a recipe URL in one message',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-herb" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onGetStarted} className="btn-primary mt-10">
              Get started free
            </button>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="relative">
              <div className="absolute -inset-4 rounded-2xl bg-sage/30 blur-2xl" aria-hidden="true" />
              <div className="relative">
                <div className="mb-3 flex items-center justify-end">
                  <span className="rounded-full bg-sage/60 px-2.5 py-0.5 text-xs font-medium text-herb-deep">
                    Live demo
                  </span>
                </div>
                <DemoChatBox
                  onGetStarted={onGetStarted}
                  autoPlay={!prefersReducedMotion}
                  showHeader={false}
                  size="large"
                />
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <section className="px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              The &quot;what&apos;s for dinner?&quot; struggle is real
            </h2>
            <p className="mt-3 text-lg text-muted">
              It&apos;s not just cooking — it&apos;s the mental load of deciding, every single day.
            </p>
          </div>
        </RevealOnScroll>

        <ul className="mx-auto max-w-2xl divide-y divide-line">
          {[
            {
              title: 'Decision fatigue',
              body: '365 days of "what should I cook?" wears you down.',
            },
            {
              title: 'Picky eaters',
              body: 'Allergies, dislikes, and preferences — remembered once, applied forever.',
            },
            {
              title: 'Budget pressure',
              body: 'Meals that use what you have and keep costs down.',
            },
            {
              title: 'Leftover guilt',
              body: 'Ingredients in the fridge, planned into tonight\'s dinner.',
            },
          ].map((item) => (
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
              How LarderMind works
            </h2>
          </div>
        </RevealOnScroll>

        <div className="mx-auto flex max-w-5xl flex-col gap-20">
          {[
            {
              step: '01',
              title: 'Smart memory',
              body: 'Tell LarderMind once that your kid is allergic to peanuts or your partner dislikes spicy food. It remembers for every plan.',
              image:
                'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80',
              alt: 'Family cooking together in a warm kitchen',
              reverse: false,
            },
            {
              step: '02',
              title: 'Cook with what you have',
              body: 'Plans prioritize ingredients already in your pantry and fridge — especially what\'s about to expire.',
              image:
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
              alt: 'Fresh vegetables and ingredients on a counter',
              reverse: true,
            },
            {
              step: '03',
              title: 'Auto grocery list',
              body: 'Only buy what you\'re missing. One sorted list, ready for your weekly shop.',
              image:
                'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=800&q=80',
              alt: 'Fresh produce at a market',
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

      <section id="join" className="border-t border-line px-[5%] py-20">
        <RevealOnScroll>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-semibold text-ink">
              Stop the dinner stress today
            </h2>
            <p className="mt-3 text-lg text-muted">
              Create a free account and start planning meals with AI in minutes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button type="button" onClick={onGetStarted} className="btn-primary">
                Get started free
              </button>
              <button type="button" onClick={onLogin} className="btn-secondary px-6 py-3">
                Log in
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
                Privacy
              </a>
            </li>
            <li>
              <a href="/legal/terms-of-service.html" className="hover:text-ink">
                Terms
              </a>
            </li>
            <li>
              <a href="mailto:support@lardermind.com" className="hover:text-ink">
                Contact
              </a>
            </li>
          </ul>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-sm text-muted">
          &copy; 2026 LarderMind. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
