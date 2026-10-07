import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from 'react';
import { SendIcon } from 'lucide-react';

export type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  ariaLabel: string;
  maxHeightPx?: number;
};

const DEFAULT_MAX_HEIGHT_PX = 240;

/**
 * Self-contained chat composer: wrapper owns the only border (focus-state),
 * textarea is chrome-bare so global form / focus-visible CSS cannot flash a second frame.
 */
export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(
  function ChatComposer(
    {
      value,
      onChange,
      onSend,
      disabled = false,
      ariaLabel,
      maxHeightPx = DEFAULT_MAX_HEIGHT_PX,
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const canSend = Boolean(value.trim()) && !disabled;

    const setTextareaRef = (el: HTMLTextAreaElement | null) => {
      innerRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    };

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = '0px';
      el.style.height = `${Math.min(el.scrollHeight, maxHeightPx)}px`;
    }, [value, maxHeightPx]);

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSend) onSend();
      }
    };

    const textareaReset: TextareaHTMLAttributes<HTMLTextAreaElement>['style'] = {
      border: 'none',
      outline: 'none',
      boxShadow: 'none',
    };

    return (
      <div
        className={`relative flex items-end rounded-[22px] border bg-surface shadow-sm min-h-[52px] ${
          focused ? 'border-herb' : 'border-line'
        }`}
      >
        <textarea
          ref={setTextareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full resize-none overflow-y-auto border-0 bg-transparent py-3 pl-4 pr-14 text-base leading-6 text-ink focus:outline-none focus-visible:outline-none disabled:opacity-60 min-h-[52px] max-h-40"
          style={textareaReset}
          disabled={disabled}
          aria-label={ariaLabel}
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          className={`absolute right-1.5 bottom-1.5 flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
            canSend
              ? 'bg-herb text-white hover:bg-herb-deep'
              : 'bg-transparent text-muted'
          }`}
        >
          <SendIcon size={16} />
        </button>
      </div>
    );
  },
);
