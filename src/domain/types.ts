// Shapes used across the app (docs/data-model.md). Money is integer cents, times are integer ms.

export const CURRENCIES = ["BRL", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** TRIP-4, in picker order. */
export const TRIP_ICONS = [
  "luggage",
  "flight",
  "beach",
  "camping",
  "restaurant",
  "home",
  "celebration",
  "sports",
  "music",
  "shopping",
  "car",
  "boat",
  "mountain",
  "city",
  "work",
  "school",
] as const;
export type TripIcon = (typeof TRIP_ICONS)[number];

export type Member = {
  id: string;
  name: string;
  /** Present for app users; absent for guests. */
  uid?: string;
  joinedAt: number;
};

export type Trip = {
  id: string;
  name: string;
  icon: TripIcon;
  currency: Currency;
  ownerUid: string;
  createdAt: number;
  /** In join order, owner first (MEM-6). */
  members: Member[];
  memberIdsByUid: Record<string, string>;
  invite: { code: string; expiresAt: number } | null;
};

export type Split = "equal" | "custom";

export type Expense = {
  id: string;
  description: string;
  amountCents: number;
  payerId: string;
  /** memberId → cents; participants are its keys, values sum to amountCents. */
  shares: Record<string, number>;
  split: Split;
  spentAt: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

export const isGuest = (m: Member) => m.uid === undefined;
