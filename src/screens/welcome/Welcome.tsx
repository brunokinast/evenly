import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { SubmitField } from "@/components/SubmitField";
import { checkName } from "@/domain/names";
import { t } from "@/i18n";
import { cn } from "@/lib/cn";
import { useNameForm } from "../useNameForm";

/** First impression (specs/design.md "Welcome"); ID-2, ID-3, ID-8: a name before Home. */
export function Welcome() {
  const form = useNameForm("");
  const id = useId();
  const ready = checkName(form.value).ok;
  return (
    <main className="mx-auto flex h-full max-w-[520px] flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[max(24px,env(safe-area-inset-bottom))]">
      <form
        className="flex w-full max-w-sm flex-col items-center text-center"
        onSubmit={(e) => {
          e.preventDefault();
          void form.submit();
        }}
      >
        <img src="/icon.svg" alt="" className="mb-5 size-18 rounded-[20px] shadow-float" />
        <h1 className="text-title">{t("welcome.hello")}</h1>
        <label htmlFor={id} className="mt-8 mb-2 text-caption font-semibold text-fg-muted">
          {t("welcome.title")}
        </label>
        <SubmitField
          id={id}
          autoFocus
          tall
          autoComplete="given-name"
          autoCapitalize="words"
          enterKeyHint="go"
          value={form.value}
          onChange={form.onChange}
          invalid={!!form.error}
          aria-describedby={`${id}-note`}
          submitLabel={t("common.continue")}
          icon={<ArrowRight aria-hidden />}
          ready={ready}
          busy={form.busy}
        />
        <p
          id={`${id}-note`}
          role={form.error ? "alert" : undefined}
          className={cn(
            "mt-3 min-h-10 text-caption text-balance",
            form.error ? "text-negative" : "text-fg-muted",
          )}
        >
          {form.error ?? t("welcome.body")}
        </p>
      </form>
    </main>
  );
}
