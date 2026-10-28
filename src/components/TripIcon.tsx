import {
  Briefcase,
  Building2,
  Car,
  GraduationCap,
  House,
  Luggage,
  Mountain,
  Music,
  PartyPopper,
  Plane,
  Sailboat,
  ShoppingBag,
  Tent,
  TreePalm,
  Trophy,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { TripIcon as TripIconId } from "@/domain/types";
import { cn } from "@/lib/cn";

/** TRIP-4 ids → Lucide icons (specs/design.md "Icons"). */
export const TRIP_ICON: Record<TripIconId, LucideIcon> = {
  luggage: Luggage,
  flight: Plane,
  beach: TreePalm,
  camping: Tent,
  restaurant: UtensilsCrossed,
  home: House,
  celebration: PartyPopper,
  sports: Trophy,
  music: Music,
  shopping: ShoppingBag,
  car: Car,
  boat: Sailboat,
  mountain: Mountain,
  city: Building2,
  work: Briefcase,
  school: GraduationCap,
};

/** Trip icon tile: 44px rounded square, accent-soft fill. */
export function TripTile({ icon, className }: { icon: TripIconId; className?: string }) {
  const Icon = TRIP_ICON[icon] ?? Luggage;
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text [&_svg]:size-6",
        className,
      )}
    >
      <Icon />
    </span>
  );
}
