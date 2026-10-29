import { useState } from "react";
import { showToast } from "@/app/toast";
import { setDisplayName } from "@/data/session";
import { checkName } from "@/domain/names";
import { t } from "@/i18n";

/** Name entry shared by Welcome and Profile: ID-3 validation on submit, busy state, save errors. */
export function useNameForm(initial: string, onSaved?: () => void) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const check = checkName(value);
    if (!check.ok) {
      setError(t(check.error === "tooShort" ? "name.tooShort" : "name.tooLong"));
      return;
    }
    if (check.name === initial) {
      onSaved?.();
      return;
    }
    setBusy(true);
    try {
      const { synced } = await setDisplayName(check.name);
      synced.catch(() => showToast(t("common.notSaved"))); // APP-9
      onSaved?.();
    } catch {
      setError(t("name.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return {
    value,
    error,
    busy,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      setError(null);
    },
    submit,
  };
}
