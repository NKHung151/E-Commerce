import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '../../shared/ui';
import ChatWidget from '../components/ChatWidget';
import Footer from './Footer';
import Header from './Header';

export default function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
