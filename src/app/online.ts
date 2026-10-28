import { useSyncExternalStore } from "react";

/** APP-6: whether the device is online. Network actions are disabled while offline. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (l) => {
      addEventListener("online", l);
      addEventListener("offline", l);
      return () => {
        removeEventListener("online", l);
        removeEventListener("offline", l);
      };
    },
    () => navigator.onLine,
  );
}
