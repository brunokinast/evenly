import { Redirect, Route, Switch } from "wouter";
import { Toaster } from "@/components/Toaster";
import { useSession } from "@/data/session";
import { ConnectError } from "@/screens/ConnectError";
import { ExpenseFormScreen } from "@/screens/expense/ExpenseForm";
import { Home } from "@/screens/home/Home";
import { TripScreen } from "@/screens/trip/TripScreen";
import { Welcome } from "@/screens/welcome/Welcome";

/** Session gate: identity first (ID-1, ID-6), then a name (ID-2), then the app (ID-4). */
export function App() {
  const session = useSession();
  if (session.status === "loading") return null; // Cached sessions resolve in a few ms; no spinner.
  if (session.status === "error") return <ConnectError />;
  if (!session.name) return <Welcome />;
  return (
    <>
      <Switch>
        <Route path="/">
          <Home />
        </Route>
        <Route path="/trip/:tripId/expense/new">{(p) => <ExpenseFormScreen tripId={p.tripId} />}</Route>
        <Route path="/trip/:tripId/expense/:expenseId/edit">
          {(p) => <ExpenseFormScreen tripId={p.tripId} expenseId={p.expenseId} />}
        </Route>
        <Route path="/trip/:tripId/:tab?">
          {(p) => <TripScreen key={p.tripId} tripId={p.tripId} tab={p.tab} />}
        </Route>
        <Route>
          <Redirect to="/" replace />
        </Route>
      </Switch>
      <Toaster />
    </>
  );
}
