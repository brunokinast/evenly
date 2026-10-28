import { useToast } from "@/app/toast";

/** Renders the current toast above the bottom bars. */
export function Toaster() {
  const toast = useToast();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--kb,0px)+var(--toast-bottom))] z-50 flex justify-center px-4"
    >
      {toast && (
        <p
          key={toast.id}
          className="toast max-w-full rounded-ctl bg-fg px-4 py-2.5 text-caption font-semibold text-bg shadow-float"
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
