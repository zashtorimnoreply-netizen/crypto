import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PortfolioProvider } from './context/PortfolioContext';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';
import MetricsDemo from './pages/MetricsDemo';
import SimulatorPage from './pages/SimulatorPage';
import ComparisonPage from './pages/ComparisonPage';
import PublicReportPage from './pages/PublicReportPage';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PortfolioProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/demo/metrics" element={<MetricsDemo />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/public/report/:reportUuid" element={<PublicReportPage />} />
          </Routes>
        </PortfolioProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
