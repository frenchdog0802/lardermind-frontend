export interface ToastState {
  text: string;
  undoIds: string[] | null;
}

/**
 * Toast whose visible timer starts when show() is called and is NOT restarted by update(),
 * so a late network result can change the text/undo ids without shortening or extending it.
 */
export function createToastController(onChange: (state: ToastState | null) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current: ToastState | null = null;

  const emit = (s: ToastState | null) => {
    current = s;
    onChange(s);
  };
  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  return {
    show(text: string, undoIds: string[] | null, durationMs: number) {
      clear();
      emit({ text, undoIds });
      timer = setTimeout(() => {
        timer = null;
        emit(null);
      }, durationMs);
    },
    /** Change text / undo ids of the visible toast without touching its timer. */
    update(text: string, undoIds: string[] | null) {
      if (current) emit({ text, undoIds });
    },
    dismiss() {
      clear();
      if (current) emit(null);
    },
    get current() {
      return current;
    },
  };
}
