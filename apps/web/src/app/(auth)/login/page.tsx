'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials');
  const [error, setError] = useState('');

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
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (step === 'credentials') {
              if (!data.get('email') || !data.get('password'))
                return setError('Enter your email and password.');
              setError('');
              setStep('mfa');
            } else if (String(data.get('code')).length !== 6) setError('Enter the 6-digit code.');
            else router.push('/dashboard');
          }}
        >
          {step === 'credentials' ? (
            <>
              <label className="block text-sm">
                Email
                <input name="email" type="email" autoComplete="username" className="input mt-1" />
              </label>
              <label className="block text-sm">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  className="input mt-1"
                />
              </label>
            </>
          ) : (
            <label className="block text-sm">
              Verification code
              <input
                name="code"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                className="input mt-1"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button className="btn-primary w-full">
            {step === 'credentials' ? 'Sign in' : 'Verify'}
          </button>
        </form>
        <p className="mt-4 text-xs text-slate-400">Demo UI. Authentication is not connected yet.</p>
      </div>
    </main>
  );
}
