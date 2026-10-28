import { person, type Person } from "@/domain/members";
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
  const ids = Object.keys(e.shares);
  const all = ids.length === view.trip.members.length && view.trip.members.every((m) => m.id in e.shares);
  return all ? t("split.all") : t("split.n", { n: ids.length });
}
