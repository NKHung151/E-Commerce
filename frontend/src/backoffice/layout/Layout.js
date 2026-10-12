import React, { Suspense, useEffect, useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { Outlet, useLocation } from 'react-router-dom';
import { Logo, PageLoader } from '../../shared/ui';
import Sidebar from './Sidebar';

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-slide-up">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Mở menu">
            <FiMenu />
          </button>
          <Logo />
        </header>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
