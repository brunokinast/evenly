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
  /** TRIP-12: the last time an expense was added, edited or deleted; absent until that first happens. */
  activeAt?: number;
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

/** What a save writes about an expense; the data layer adds who and when (docs/data-model.md). */
export type ExpenseInput = Pick<
  Expense,
  "description" | "amountCents" | "payerId" | "shares" | "split" | "spentAt"
>;

export const isGuest = (m: Member) => m.uid === undefined;
