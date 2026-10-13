import React from 'react';
import { RouteOutlet } from '../../shared/ui';
import ChatWidget from '../components/ChatWidget';
import Footer from './Footer';
import Header from './Header';

export default function ShopLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <RouteOutlet />
      </main>
      <Footer />
      <ChatWidget />
    </div>
  );
}
