import { MenuIcon, ArrowLeftIcon, PlusIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AppHeaderProps {
  title: string;
  onOpenMenu?: () => void;
  onBack?: () => void;
  showBack?: boolean;
  onNewChat?: () => void;
  rightSlot?: React.ReactNode;
  subtitle?: React.ReactNode;
}

export function AppHeader({
  title,
  onOpenMenu,
  onBack,
  showBack = false,
  onNewChat,
  rightSlot,
  subtitle,
}: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-linen/95 backdrop-blur-sm border-b border-line">
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 h-14 max-w-3xl mx-auto w-full">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-sage/50 transition-colors shrink-0"
            aria-label={t('common.back')}
          >
            <ArrowLeftIcon size={22} />
          </button>
        ) : onOpenMenu ? (
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-sage/50 transition-colors shrink-0"
            aria-label={t('nav.openMenu')}
          >
            <MenuIcon size={22} />
          </button>
        ) : (
          <div className="w-10 shrink-0" />
        )}

        <div className="flex-1 min-w-0 text-center">
          <h1 className="font-display text-lg sm:text-xl font-semibold text-ink truncate">
            {title}
          </h1>
          {subtitle ? (
            <div className="text-xs text-muted truncate mt-0.5">{subtitle}</div>
          ) : null}
        </div>

        {rightSlot ? (
          rightSlot
        ) : onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            className="w-10 h-10 flex items-center justify-center rounded-full text-ink hover:bg-sage/50 transition-colors shrink-0"
            aria-label={t('nav.newChat')}
            title={t('nav.newChat')}
          >
            <PlusIcon size={22} />
          </button>
        ) : (
          <div className="w-10 shrink-0" />
        )}
      </div>
    </header>
  );
}
