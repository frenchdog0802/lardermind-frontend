import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();

  useEffect(() => {
    const previous = document.title;
    document.title = `${t('notFound.title')} — LarderMind`;
    // Keep crawlers from indexing soft-404s if the host ever serves this with 200.
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => {
      document.title = previous;
      robots.remove();
    };
  }, [t]);

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-linen px-6 text-center">
      <p className="font-display text-6xl font-semibold text-herb">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-ink">{t('notFound.title')}</h1>
      <p className="mt-3 max-w-md text-muted">{t('notFound.body')}</p>
      <a href="/" className="btn-primary mt-8">
        {t('notFound.home')}
      </a>
    </main>
  );
}
