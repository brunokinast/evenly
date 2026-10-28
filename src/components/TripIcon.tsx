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
import { IconTile } from "./List";

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
export function TripTile({ icon }: { icon: TripIconId }) {
  const Icon = TRIP_ICON[icon] ?? Luggage;
  return (
    <IconTile>
      <Icon />
    </IconTile>
  );
}
