/** Change notifications for a module-level store read with useSyncExternalStore(changes.subscribe, getValue). */
export function changes() {
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify() {
      listeners.forEach((l) => l());
    },
  };
}
