import { useEffect, useState } from "react";
import { ChevronRight, Smartphone } from "lucide-react";
import { useInstall } from "@/app/install";
import { setTheme, useTheme, type ThemeChoice } from "@/app/theme";
import { Button } from "@/components/Button";
import { Segmented } from "@/components/Segmented";
import { Sheet } from "@/components/Sheet";
import { TextField } from "@/components/TextField";
import { t } from "@/i18n";
import { useNameForm } from "../useNameForm";

type Props = { open: boolean; name: string; onClose: () => void; onInstall: () => void };

/** ID-9 name (Done/Enter saves, other closes discard), APP-2 theme, APP-3 install row. */
export function ProfileSheet({ open, name, onClose, onInstall }: Props) {
  // While a name is saving, only Done's own completion closes the sheet (a "discard" can't race the save).
  const [saving, setSaving] = useState(false);
  return (
    <Sheet open={open} onClose={() => !saving && onClose()} title={t("profile.title")}>
      {/* Remounted on each open, so a discarded edit doesn't come back. */}
      {open && <ProfileForm name={name} onClose={onClose} onInstall={onInstall} onSaving={setSaving} />}
    </Sheet>
  );
}

function ProfileForm({
  name,
  onClose,
  onInstall,
  onSaving,
}: Omit<Props, "open"> & { onSaving: (saving: boolean) => void }) {
  const form = useNameForm(name, onClose);
  useEffect(() => onSaving(form.busy), [form.busy, onSaving]);
  const theme = useTheme();
  const { method } = useInstall();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <TextField
        label={t("name.label")}
        showLabel
        autoFocus
        enterKeyHint="done"
        autoCapitalize="words"
        value={form.value}
        onChange={form.onChange}
        error={form.error}
      />
      <span className="text-caption text-fg-muted">{t("profile.theme")}</span>
      <Segmented<ThemeChoice>
        label={t("profile.theme")}
        value={theme}
        onChange={setTheme}
        options={[
          { value: "system", label: t("theme.system") },
          { value: "light", label: t("theme.light") },
          { value: "dark", label: t("theme.dark") },
        ]}
      />
      {method && (
        <button
          type="button"
          onClick={onInstall}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-1 text-left active:bg-surface-2"
        >
          <Smartphone className="size-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-row">{t("install.row")}</span>
          <ChevronRight className="size-5 shrink-0 text-fg-muted" aria-hidden />
        </button>
      )}
      <Button type="submit" variant="primary" busy={form.busy} className="w-full">
        {t("common.done")}
      </Button>
    </form>
  );
}
