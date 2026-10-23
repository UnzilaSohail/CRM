/** Stand-in for a screen that is not built yet. Delete as each UX screen lands. */
export function Placeholder({ title, screen }: { title: string; screen: string }) {
  return (
    <main className="p-8">
      <p className="text-sm text-action">{screen}</p>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm">Not built yet.</p>
    </main>
  );
}
