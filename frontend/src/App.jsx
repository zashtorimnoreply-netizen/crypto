import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PortfolioProvider } from './context/PortfolioContext';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Settings from './pages/Settings';
import MetricsDemo from './pages/MetricsDemo';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <PortfolioProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/demo/metrics" element={<MetricsDemo />} />
          </Routes>
        </PortfolioProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
