import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { t } from "@/i18n";
import { useNameForm } from "../useNameForm";

/** ID-2, ID-3, ID-8: asks for a name before Home. */
export function Welcome() {
  const form = useNameForm("");
  return (
    <form
      className="mx-auto flex h-full max-w-[520px] flex-col px-4 pt-[max(48px,env(safe-area-inset-top))]"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <div className="flex flex-1 flex-col gap-3">
        <h1 className="text-title">{t("welcome.title")}</h1>
        <p className="text-caption text-fg-muted">{t("welcome.body")}</p>
        <TextField
          label={t("name.label")}
          autoFocus
          enterKeyHint="go"
          autoCapitalize="words"
          value={form.value}
          onChange={form.onChange}
          error={form.error}
          className="mt-2"
        />
      </div>
      <div className="pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button type="submit" variant="primary" busy={form.busy} className="w-full">
          {t("common.continue")}
        </Button>
      </div>
    </form>
  );
}
