import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Under the title, e.g. the expense's date and time. */
  subtitle?: string;
  /** Top-right of the header, e.g. a small Edit button. */
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Bottom sheet (specs/design.md): drag handle, title, content, max 85% height. Closes on backdrop tap,
 * swipe down, Escape and Android back. A native <dialog> keeps focus inside and focuses the first input
 * (give it `autoFocus`). Content updates in place while open.
 */
export function Sheet({ open, onClose, title, subtitle, action, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const unregister = registerBack(() => close.current());
    return () => {
      unregister();
      dialog.close();
    };
  }, [open]);

  const drag = useRef<{ startY: number; dy: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.startY);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onPointerUp = () => {
    if (!drag.current || !ref.current) return;
    const swiped = drag.current.dy > 80;
    drag.current = null;
    ref.current.style.transform = "";
    if (swiped) onClose();
  };

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop
      }}
      className="sheet fixed inset-x-0 top-auto bottom-[var(--kb,0px)] m-0 mx-auto flex max-h-[85dvh] w-full max-w-[520px] flex-col rounded-t-sheet bg-surface p-0 text-fg shadow-float backdrop:bg-scrim"
    >
      <div
        className="shrink-0 cursor-grab touch-none px-4 pt-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div aria-hidden className="mx-auto mb-1 h-1 w-9 rounded bg-border" />
        <div className="flex items-start gap-3 pt-1.5 pb-2.5">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-[18px] leading-6 font-bold text-balance break-words">{title}</h2>
            {subtitle && <p className="text-caption text-fg-muted">{subtitle}</p>}
          </div>
          {action && <div onPointerDown={(e) => e.stopPropagation()}>{action}</div>}
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </dialog>
  );
}

// Android back closes the top sheet first: while any sheet is open, one extra history entry exists,
// marked with a token unique to this page load.
const stack: (() => void)[] = [];
let entry: string | null = null; // token of our entry, while it exists
let backPending = false; // we called history.back() and its popstate hasn't arrived yet

// A reload while a sheet was open leaves a marked entry behind; unmark it so back works normally.
if (history.state?.evenlySheet) history.replaceState(null, "");

function pushEntry() {
  entry = `${Date.now()}-${Math.random()}`;
  history.pushState({ evenlySheet: entry }, "");
}

function registerBack(close: () => void) {
  stack.push(close);
  if (entry === null && !backPending) pushEntry();
  return () => {
    stack.splice(stack.indexOf(close), 1);
    // Deferred so a sheet that remounts right away (React StrictMode) keeps the entry.
    setTimeout(() => {
      if (stack.length > 0 || entry === null) return;
      const onEntry = history.state?.evenlySheet === entry;
      entry = null;
      if (onEntry) {
        backPending = true;
        history.back();
      }
    });
  };
}

addEventListener("popstate", () => {
  if (backPending) {
    // Our own back finished. A sheet opened meanwhile gets its entry now.
    backPending = false;
    if (stack.length > 0 && entry === null) pushEntry();
    return;
  }
  if (entry === null || history.state?.evenlySheet === entry) return;
  entry = null;
  stack.at(-1)?.();
});
