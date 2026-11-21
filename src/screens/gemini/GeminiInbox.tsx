import { useEffect } from "react";
import { useLocation } from "wouter";
import { startInbox, useCalendarInbox } from "@/app/calendarInbox";
import { useSheetsOpen } from "@/components/Sheet";
import { useMe } from "@/data/session";
import { useMyTrips } from "@/data/trips";
import { GeminiReview } from "./GeminiReview";

/** AST-3, AST-6: the "From Gemini" review, over whatever screen is showing (mounted once, in App). */
export function GeminiInbox() {
  // Only where the calendar can be read (the Android app): elsewhere it costs nothing, not even the trips query.
  return useCalendarInbox().available ? <Inbox /> : null;
}

function Inbox() {
  const me = useMe();
  const trips = useMyTrips(me.uid); // Home's shared listener: no extra read when Home is showing
  const [path] = useLocation();
  const sheetsOpen = useSheetsOpen();
  // AST-3: the calendar is read only once the trips have loaded, so starting up is never slower.
  const ready = trips.status === "ready";
  useEffect(() => {
    if (ready) startInbox();
  }, [ready]);
  if (!ready) return null;
  // AST-6: wait while the user is in the middle of something.
  const busy = sheetsOpen || path.includes("/expense/");
  return <GeminiReview trips={trips.data} myUid={me.uid} busy={busy} />;
}
