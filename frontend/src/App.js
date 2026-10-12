import React, { Suspense, lazy } from 'react';
import { FeedbackProvider, PageLoader } from './shared/ui';

// Two independent apps with separate sessions. The back office is code-split so
// shoppers never download it.
const ShopApp = lazy(() => import('./shop/ShopApp'));
const BackofficeApp = lazy(() => import('./backoffice/BackofficeApp'));

const BACKOFFICE_PREFIXES = ['/admin', '/staff'];

export default function App() {
  const path = window.location.pathname;
  const backofficeBase = BACKOFFICE_PREFIXES.find((p) => path === p || path.startsWith(`${p}/`));

  return (
    <FeedbackProvider>
      <Suspense fallback={<PageLoader />}>
        {backofficeBase ? <BackofficeApp basename={backofficeBase} /> : <ShopApp />}
      </Suspense>
    </FeedbackProvider>
  );
}
