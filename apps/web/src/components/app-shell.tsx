"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard, Users, FolderKanban, CheckSquare, Sun, Clock, BarChart3, AlertTriangle,
  MessageSquare, FileText, Settings, Bell, Search, Menu, X, Globe,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/my-day", label: "My Day", icon: Sun },
  { href: "/attendance", label: "Attendance", icon: Clock },
  { href: "/kpi", label: "KPI Scorecard", icon: BarChart3 },
  { href: "/deviations", label: "Deviation Center", icon: AlertTriangle },
  { href: "/chat", label: "Messages", icon: MessageSquare },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col bg-navy text-slate-200">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-semibold text-white">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm">Ai</span>
        AiNetworks
      </div>
      <ul className="flex-1 space-y-0.5 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-brand text-white" : "hover:bg-navy-700",
                )}
              >
                <Icon size={18} aria-hidden /> {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/portal" className="m-3 flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs hover:bg-navy-700">
        <Globe size={14} aria-hidden /> Preview client portal
      </Link>
      <div className="border-t border-white/10 p-4 text-sm">
        <p className="font-medium text-white">Iqbal Butt</p>
        <p className="text-xs text-slate-400">CEO &amp; Founder</p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 md:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
          <button className="btn-ghost md:hidden" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
            <input className="input pl-9" placeholder="Search customers, projects, tasks…" aria-label="Global search" />
          </div>
          <button className="btn-ghost relative" aria-label="Notifications, 5 unread">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 rounded-full bg-danger px-1.5 text-[10px] text-white">5</span>
          </button>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
