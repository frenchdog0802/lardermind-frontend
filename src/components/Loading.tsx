import { useTranslation } from 'react-i18next';

interface LoadingProps {
  fullScreen?: boolean;
  /** Smaller spinner for in-page placeholders (less jarring on mobile tab switches). */
  compact?: boolean;
}

export function Loading({ fullScreen, compact }: LoadingProps) {
  const { t } = useTranslation();

  const spinnerClass = compact
    ? 'animate-spin rounded-full h-7 w-7 border-2 border-line border-t-herb mb-2'
    : 'animate-spin rounded-full h-12 w-12 border-2 border-line border-t-herb mb-4';

  const content = (
    <>
      <div className={spinnerClass} />
      <p className={`text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{t('common.loading')}</p>
    </>
  );

  if (fullScreen) {
    return (
      <div className="flex flex-col w-full min-h-screen bg-linen items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-8' : 'py-12'}`}>
      {content}
    </div>
  );
}
