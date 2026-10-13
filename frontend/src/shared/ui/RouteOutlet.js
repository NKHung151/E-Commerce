import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { PageLoader } from './states';

/** Opt in to React Router v7 behaviour now (and silence its upgrade warnings). */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };

/**
 * Page slot of a layout: lazy pages show a loader while their chunk loads, and an
 * error on one page is contained there and cleared by navigating elsewhere.
 */
export function RouteOutlet() {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname}>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}
