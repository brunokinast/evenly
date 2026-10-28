import { useId } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
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
        <div className="relative w-full">
          <input
            id={id}
            autoFocus
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="go"
            value={form.value}
            onChange={form.onChange}
            aria-invalid={form.error ? true : undefined}
            aria-describedby={`${id}-note`}
            className={cn(
              "h-14 w-full rounded-full border border-border bg-surface pr-16 pl-5 text-body text-fg shadow-sm",
              "placeholder:text-fg-muted focus:border-accent focus:outline-none",
              form.error && "border-negative",
            )}
          />
          <button
            type="submit"
            aria-label={t("common.continue")}
            className={cn(
              "absolute top-1/2 right-1.5 grid size-11 -translate-y-1/2 place-items-center rounded-full transition-colors [&_svg]:size-5",
              ready ? "bg-accent text-accent-fg active:brightness-95" : "bg-surface-2 text-fg-muted",
            )}
          >
            {form.busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
          </button>
        </div>
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
