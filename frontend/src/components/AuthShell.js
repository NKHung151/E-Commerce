import React from 'react';
import { APP_NAME } from '../config';

/** Split-screen layout for login / register pages (shop and back office). */
export default function AuthShell({ title, subtitle, children, aside, tone = 'from-brand-600 via-brand-700 to-violet-700' }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className={`relative hidden overflow-hidden bg-gradient-to-br ${tone} p-12 text-white lg:flex lg:flex-col lg:justify-between`}>
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">P</span>
          {APP_NAME}
        </div>
        <div className="relative max-w-md">{aside}</div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} PTIT — Kiến trúc & Thiết kế phần mềm</p>
      </div>
      <div className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
