import { useSession } from "@/data/session";
import { ConnectError } from "@/screens/ConnectError";
import { Home } from "@/screens/home/Home";
import { Welcome } from "@/screens/welcome/Welcome";

/** Session gate: identity first (ID-1, ID-6), then a name (ID-2), then the app (ID-4). */
export function App() {
  const session = useSession();
  if (session.status === "loading") return null; // Cached sessions resolve in a few ms; no spinner.
  if (session.status === "error") return <ConnectError />;
  if (!session.name) return <Welcome />;
  return <Home uid={session.uid} name={session.name} />;
}
