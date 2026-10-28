import { useState } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  disabled?: boolean;
  /** Shown if onConfirm fails. */
  errorText: string;
};

/** Confirmation (specs/design.md): the consequence in plain words, the destructive action in red. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onClose,
  disabled,
  errorText,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={title}>
      <p className="text-body text-fg-muted">{body}</p>
      {failed && (
        <p role="alert" className="text-caption text-negative">
          {errorText}
        </p>
      )}
      <Button
        className="w-full bg-negative text-surface"
        busy={busy}
        disabled={disabled}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            await onConfirm();
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        {confirm}
      </Button>
      <Button variant="secondary" className="w-full" onClick={onClose} disabled={busy}>
        {cancel}
      </Button>
    </Sheet>
  );
}
