import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PortfolioProvider } from './context/PortfolioContext';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/UI/Loading';

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

export default App;
