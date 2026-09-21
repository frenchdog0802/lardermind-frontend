import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BotMessageSquare,
  CalendarIcon,
  PackageIcon,
  ShoppingCart,
  UtensilsIcon,
  SettingsIcon,
  CreditCard,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import { chatApi, ChatSession } from '../api/chat';

export type AppDrawerView =
  | 'aiAssistant'
  | 'calendar'
  | 'pantryInventory'
  | 'shoppingList'
  | 'recipeManager'
  | 'settings'
  | 'subscription';

interface AppDrawerProps {
  open: boolean;
  activeView: string;
  onClose: () => void;
  onNavigate: (view: AppDrawerView) => void;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

const PRIMARY: Array<{
  view: AppDrawerView;
  icon: typeof BotMessageSquare;
  labelKey: string;
}> = [
  { view: 'aiAssistant', icon: BotMessageSquare, labelKey: 'nav.aiChat' },
  { view: 'calendar', icon: CalendarIcon, labelKey: 'nav.calendar' },
  { view: 'pantryInventory', icon: PackageIcon, labelKey: 'nav.inventory' },
  { view: 'shoppingList', icon: ShoppingCart, labelKey: 'nav.shopping' },
  { view: 'recipeManager', icon: UtensilsIcon, labelKey: 'nav.recipes' },
];

export function AppDrawer({
  open,
  activeView,
  onClose,
  onNavigate,
  onSelectSession,
  onNewChat,
}: AppDrawerProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);

  const refreshSessions = useCallback(async () => {
    setLoadingSessions(true);
    setSessionsError(false);
    try {
      const res = await chatApi.listSessions();
      const list = res.data?.sessions ?? [];
      setSessions([...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
    } catch {
      setSessions([]);
      setSessionsError(true);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void refreshSessions();
  }, [open, refreshSessions]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (view: AppDrawerView) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-ink/30 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(20rem,88vw)] bg-linen border-r border-line flex flex-col shadow-lg transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.openMenu')}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <h2 className="font-display text-2xl font-semibold text-ink">LarderMind</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-sage/50 transition-colors"
            aria-label={t('nav.closeMenu')}
          >
            <XIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {PRIMARY.map(({ view, icon: Icon, labelKey }) => {
            const active = activeView === view;
            return (
              <button
                key={view}
                type="button"
                onClick={() => go(view)}
                className={`w-full flex items-center gap-3 mb-1 px-3 py-3 rounded-xl text-left transition-colors ${
                  active ? 'bg-sage text-herb-deep' : 'text-ink hover:bg-sage/40'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
                <span className={`text-base ${active ? 'font-semibold' : 'font-medium'}`}>
                  {t(labelKey)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="mt-3 mb-4 w-full flex items-center justify-center gap-2 bg-herb hover:bg-herb-deep text-white py-3 rounded-full font-semibold transition-colors"
          >
            <PlusIcon size={18} />
            {t('nav.newChat')}
          </button>

          <p className="text-xs uppercase tracking-wide text-muted px-3 mb-2">
            {t('nav.recents')}
          </p>

          {loadingSessions ? (
            <p className="text-sm text-muted px-3 py-2">{t('common.loading')}</p>
          ) : sessionsError ? (
            <p className="text-sm text-muted px-3 py-2">{t('nav.recentsLoadError')}</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted px-3 py-2">{t('nav.recentsEmpty')}</p>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => {
                  onSelectSession(session.id);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-ink hover:bg-sage/40 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
                <span className="text-sm truncate flex-1">
                  {session.title?.trim() || t('nav.aiChat')}
                </span>
              </button>
            ))
          )}
        </nav>

        <div className="border-t border-line px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] bg-linen">
          <button
            type="button"
            onClick={() => go('settings')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors mb-1 ${
              activeView === 'settings' ? 'bg-sage text-herb-deep' : 'text-ink hover:bg-sage/40'
            }`}
          >
            <SettingsIcon size={20} />
            <span className="text-base font-medium">{t('nav.settings')}</span>
          </button>

          <button
            type="button"
            onClick={() => go('subscription')}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
              activeView === 'subscription' ? 'bg-sage text-herb-deep' : 'text-ink hover:bg-sage/40'
            }`}
          >
            <CreditCard size={20} />
            <span className="text-base font-medium">{t('nav.subscription')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
