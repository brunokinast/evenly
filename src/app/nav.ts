import { leaveSheets } from "@/components/Sheet";

// History-aware navigation between screens. Going "back" to Home or a trip pops the history when we came
// from there, so Android Back never returns to a screen the user already left (e.g. a deleted trip).

type Navigate = (to: string, options?: { replace?: boolean; state?: unknown }) => void;
type NavState = { fromHome?: boolean; fromTrip?: boolean } | null;
const state = () => history.state as NavState;

/** Home → a trip (from a row, New trip or Join). */
export async function openTrip(navigate: Navigate, url: string) {
  await leaveSheets();
  navigate(url, { state: { fromHome: location.pathname === "/" } });
}

/** Back to Home: pops the trip if we came from Home, else replaces it. */
export async function goHome(navigate: Navigate) {
  await leaveSheets();
  if (state()?.fromHome) history.back();
  else navigate("/", { replace: true });
}

/** Trip → Add/Edit expense. */
export async function openExpenseForm(navigate: Navigate, url: string) {
  await leaveSheets();
  navigate(url, { state: { fromTrip: true } });
}

/** Expense form → its trip: pops the form if we came from the trip, else replaces it. */
export async function backToTrip(navigate: Navigate, tripId: string) {
  await leaveSheets();
  if (state()?.fromTrip) history.back();
  else navigate(`/trip/${tripId}`, { replace: true });
}

/** Switches the trip tab in place, keeping where the trip was opened from. */
export async function switchTab(navigate: Navigate, url: string) {
  await leaveSheets();
  navigate(url, { replace: true, state: history.state });
}
