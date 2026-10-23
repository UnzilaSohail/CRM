/** Shown when the API answers 403: the user is signed in but their role cannot see this screen. */
export function AccessDenied({ what = 'this page' }: { what?: string }) {
  return (
    <div role="alert" className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <h2 className="text-lg font-semibold text-navy">Access denied</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your role does not include access to {what}. Ask an administrator if you need it.
      </p>
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-danger/30 bg-danger-50 p-6 text-sm text-danger"
    >
      {message}
    </div>
  );
}
