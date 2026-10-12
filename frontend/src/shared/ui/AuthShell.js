import React from 'react';
import { APP_NAME } from '../../config';
import { Logo } from './Logo';

/** Split-screen layout for login / register pages (shop and back office). */
export function AuthShell({ title, subtitle, children, aside, tone = 'from-brand-600 via-brand-700 to-violet-700' }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className={`relative hidden overflow-hidden bg-gradient-to-br ${tone} p-12 text-white lg:flex lg:flex-col lg:justify-between`}>
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <Logo tone="light" className="relative" />
        <div className="relative max-w-md">{aside}</div>
        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} {APP_NAME}. Mua sắm thông minh mỗi ngày.</p>
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

/** Icon + text bullet list used in the AuthShell aside. */
export function AuthAside({ heading, points }) {
  return (
    <>
      <h2 className="text-4xl font-bold leading-tight">{heading}</h2>
      <ul className="mt-8 space-y-4 text-white/90">
        {points.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3">
            <Icon className="h-5 w-5" /> {text}
          </li>
        ))}
      </ul>
    </>
  );
}
