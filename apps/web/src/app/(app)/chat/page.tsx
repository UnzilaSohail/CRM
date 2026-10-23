'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Avatar, Badge, Card, PageHeader } from '@/components/ui';
import { chat as seed } from '@/lib/data';

export default function ChatPage() {
  const [msgs, setMsgs] =
    useState<{ who: string; time: string; text: string; file?: string }[]>(seed);
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(true);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setMsgs([
      ...msgs,
      { who: 'Iqbal Butt', time: new Date().toTimeString().slice(0, 5), text: text.trim() },
    ]);
    setText('');
  };

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Core API migration"
        actions={
          <Badge tone={internal ? 'neutral' : 'info'}>
            {internal ? 'Internal channel' : 'Customer-visible channel'}
          </Badge>
        }
      />
      <Card>
        <ul className="mb-4 max-h-[55vh] space-y-4 overflow-y-auto" aria-live="polite">
          {msgs.map((m, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <Avatar name={m.who} />
              <div>
                <p>
                  <b className="font-medium text-navy">{m.who}</b>{' '}
                  <span className="text-xs text-slate-400">{m.time}</span>
                </p>
                <p>{m.text}</p>
                {m.file && (
                  <span className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs">
                    📎 {m.file}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={send} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={!internal}
              onChange={(e) => setInternal(!e.target.checked)}
            />{' '}
            Visible to customer
          </label>
          <input
            className="input flex-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            aria-label="Message"
          />
          <button className="btn-primary" disabled={!text.trim()} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </Card>
    </>
  );
}
