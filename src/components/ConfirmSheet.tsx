import { useState } from "react";
import { t } from "@/i18n";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  title: string;
  /** The consequence; none when the title says it all. */
  body?: string;
  confirm: string;
  /** Default "Cancel". */
  cancel?: string;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
  disabled?: boolean;
  /** Shown if onConfirm fails. Default: the generic error. */
  errorText?: string;
};

/** Confirmation (specs/design.md): the consequence in plain words, the destructive action in red. */
export function ConfirmSheet({
  open,
  title,
  body,
  confirm,
  cancel = t("common.cancel"),
  onConfirm,
  onClose,
  disabled,
  errorText = t("common.error"),
}: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Sheet open={open} onClose={() => !busy && onClose()} title={title}>
      {body && <p className="text-body text-fg-muted">{body}</p>}
      {failed && (
        <p role="alert" className="text-caption text-negative">
          {errorText}
        </p>
      )}
      <Button
        variant="danger"
        className="w-full"
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
