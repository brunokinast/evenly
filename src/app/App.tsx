// Placeholder shell; the identity slice replaces it with the session gate and routes.
export function App() {
  return (
    <main className="mx-auto flex h-full max-w-[520px] flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-title">Evenly</h1>
      <p className="text-caption text-fg-muted">Scaffold is running.</p>
      <button className="h-12 rounded-ctl bg-accent px-6 text-row text-accent-fg">Primary action</button>
    </main>
  );
}
