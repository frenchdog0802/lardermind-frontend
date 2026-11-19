import { useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, GlobeIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, changeAppLanguage, type AppLanguage } from '../i18n';

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const current =
    SUPPORTED_LANGUAGES.find((l) => i18n.language?.startsWith(l.code)) ?? SUPPORTED_LANGUAGES[0];

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const idx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === current.code);
    itemRefs.current[Math.max(idx, 0)]?.focus();

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const select = async (code: AppLanguage) => {
    close(true);
    if (code !== current.code) await changeAppLanguage(code);
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative shrink-0 ${className}`} data-testid="language-switcher">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            close(true);
          }
        }}
        aria-label={t('common.language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="h-10 px-2.5 inline-flex items-center gap-1.5 rounded-full text-sm font-medium text-ink hover:bg-sage/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-herb"
      >
        <GlobeIcon size={18} aria-hidden="true" />
        <span aria-hidden="true">{current.short}</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={t('common.language')}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 top-full mt-1 min-w-[10rem] z-50 rounded-lg border border-line bg-surface shadow-lg py-1"
        >
          {SUPPORTED_LANGUAGES.map((l, idx) => {
            const active = l.code === current.code;
            return (
              <button
                key={l.code}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={l.htmlLang}
                onClick={() => void select(l.code)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left hover:bg-sage/50 focus:bg-sage/50 focus:outline-none ${
                  active ? 'font-semibold text-herb-deep' : 'text-ink'
                }`}
              >
                <span>{l.native}</span>
                {active ? <CheckIcon size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
