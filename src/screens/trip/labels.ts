import { person, type Person } from "@/domain/members";
import { splitsAll } from "@/domain/split";
import type { Expense } from "@/domain/types";
import { t } from "@/i18n";
import type { TripView } from "./TripScreen";

/** A member by id; ids no longer in the trip show as "Former member". */
export const who = (view: TripView, id: string): Person => person(view.people, id, t("members.former"));

/** In sentences and pickers the current user is "You". */
export const label = (view: TripView, id: string) =>
  id === view.myMemberId ? t("common.you") : who(view, id).name;

/** Expense row caption: "Split between all" / "Split between 3" / "Custom split". */
export function splitLabel(view: TripView, e: Expense) {
  if (e.split === "custom") return t("split.custom");
  const all = splitsAll(
    e,
    view.trip.members.map((m) => m.id),
  );
  return all ? t("split.all") : t("split.n", { n: Object.keys(e.shares).length });
}
