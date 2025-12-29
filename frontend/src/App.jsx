import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { PortfolioProvider } from './context/PortfolioContext';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/UI/Loading';

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const Settings = lazy(() => import('./pages/Settings'));
const MetricsDemo = lazy(() => import('./pages/MetricsDemo'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const ComparisonPage = lazy(() => import('./pages/ComparisonPage'));
const PublicReportPage = lazy(() => import('./pages/PublicReportPage'));

// Loading fallback for lazy loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <Loading size="lg" text="Loading page..." />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PortfolioProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/demo/metrics" element={<MetricsDemo />} />
              <Route path="/comparison" element={<ComparisonPage />} />
              <Route path="/public/report/:reportUuid" element={<PublicReportPage />} />
            </Routes>
          </Suspense>
        </PortfolioProvider>
      </Router>
    </ErrorBoundary>
  );
}

// Wrap App with Sentry profiler if enabled
export default import.meta.env.VITE_SENTRY_DSN 
  ? Sentry.withProfiler(App) 
  : App;
