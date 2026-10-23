'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const expired = params.get('expired') === '1';
  const [mfa, setMfa] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Enter your email and password.');

    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mfa && code ? { code: code.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace(body.role === 'CUSTOMER' ? '/portal' : '/dashboard');
        router.refresh();
        return;
      }
      if (body.mfaRequired) {
        setMfa(true);
        setError('');
      } else if (res.status === 429) {
        setError('Too many attempts. Wait a few minutes and try again.');
      } else {
        setError(body.message ?? 'Sign in failed.');
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy p-4">
      <div className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2 text-lg font-semibold text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm text-white">
            Ai
          </span>
          AiNetworks CRM
        </div>
        <h1 className="mb-4 text-xl font-semibold text-navy">Sign in</h1>
        {expired && (
          <p role="status" className="mb-3 rounded-lg bg-warning-50 p-2 text-sm text-amber-800">
            Your session expired. Sign in again to continue.
          </p>
        )}
        <form className="space-y-4" onSubmit={submit} noValidate>
          {!mfa ? (
            <>
              <label className="block text-sm">
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  className="input mt-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="input mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Enter the 6-digit code from your authenticator app.
              </p>
              <label className="block text-sm">
                Verification code
                <input
                  name="code"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="input mt-1"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" disabled={busy}>
            {busy ? 'Signing in…' : mfa ? 'Verify' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
