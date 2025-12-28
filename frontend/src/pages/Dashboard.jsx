import { useState, useCallback } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import useEquityCurve from '../hooks/useEquityCurve';
import { useAllocation } from '../hooks/useAllocation';
import { formatCurrency } from '../utils/formatters';
import { FiDollarSign, FiTrendingUp, FiActivity, FiPercent } from 'react-icons/fi';
import Header from '../components/Layout/Header';
import LeftPanel from '../components/Layout/LeftPanel';
import RightPanel from '../components/Layout/RightPanel';
import CSVUpload from '../components/Import/CSVUpload';
import BybitSync from '../components/Import/BybitSync';
import EquityCurveChart from '../components/Charts/EquityCurveChart';
import AllocationChart from '../components/Charts/AllocationChart';
import PositionsList from '../components/Charts/PositionsList';
import MetricsCard from '../components/Metrics/MetricsCard';
import RiskIndicators from '../components/Metrics/RiskIndicators';
import Loading from '../components/UI/Loading';

const Dashboard = () => {
  const { currentPortfolio, currentPortfolioId, loading, refreshPortfolio } = usePortfolioContext();
  const { data: equityCurve, loading: equityCurveLoading, error: equityCurveError, stats, refetch: refetchEquityCurve } = useEquityCurve(currentPortfolioId);
  const { 
    allocation, 
    positions, 
    totalValue,
    loading: allocationLoading, 
    error: allocationError, 
    refetch: refetchAllocation 
  } = useAllocation(currentPortfolioId);

  const [highlightedSymbol, setHighlightedSymbol] = useState(null);

  const handleImportSuccess = () => {
    refreshPortfolio();
    refetchEquityCurve();
    refetchAllocation();
  };

  const handleEquityDateRangeChange = useCallback(() => {
    // Handle date range change - the hook will refetch automatically
  }, []);

  const handleSliceClick = (symbol) => {
    setHighlightedSymbol(symbol === highlightedSymbol ? null : symbol);
  };

  const handlePositionClick = (symbol) => {
    setHighlightedSymbol(symbol === highlightedSymbol ? null : symbol);
  };

  if (loading && !currentPortfolio) {
    return <Loading fullScreen text="Loading portfolio..." />;
  }

  // Mock metrics (replace with real data from backend)
  const mockMetrics = [
    {
      title: 'Total Value',
      value: formatCurrency(125430.50),
      change: 5.3,
      icon: FiDollarSign,
      tooltip: 'Total portfolio value in USD',
    },
    {
      title: 'Total Return',
      value: '+23.4%',
      change: 2.1,
      icon: FiTrendingUp,
      tooltip: 'Total return since inception',
    },
    {
      title: 'Daily Change',
      value: formatCurrency(1250.30),
      change: 1.0,
      icon: FiActivity,
      tooltip: 'Change in the last 24 hours',
    },
    {
      title: 'Win Rate',
      value: '68.5%',
      change: 0,
      icon: FiPercent,
      tooltip: 'Percentage of profitable trades',
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        portfolioName={currentPortfolio?.portfolio_name || 'My Portfolio'}
        lastUpdated={currentPortfolio?.updated_at}
        onRefresh={refreshPortfolio}
        loading={loading}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel>
          <CSVUpload portfolioId={currentPortfolioId} onSuccess={handleImportSuccess} />
          <BybitSync portfolioId={currentPortfolioId} onSuccess={handleImportSuccess} />
        </LeftPanel>

        <RightPanel>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {mockMetrics.map((metric, index) => (
              <MetricsCard key={index} {...metric} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <EquityCurveChart
              portfolioName={currentPortfolio?.portfolio_name || 'My Portfolio'}
              data={equityCurve}
              loading={equityCurveLoading}
              error={equityCurveError}
              onRetry={handleEquityDateRangeChange}
              stats={stats}
              showBenchmarks={true}
            />
            <AllocationChart
              data={allocation}
              totalValue={totalValue}
              loading={allocationLoading}
              error={allocationError}
              onRetry={refetchAllocation}
              onSliceClick={handleSliceClick}
              highlightedSymbol={highlightedSymbol}
            />
          </div>

          <div className="mb-6">
            <PositionsList
              positions={positions}
              loading={allocationLoading}
              error={allocationError}
              onRetry={refetchAllocation}
              onPositionClick={handlePositionClick}
              highlightedSymbol={highlightedSymbol}
            />
          </div>

          <RiskIndicators volatility={null} sharpeRatio={null} maxDrawdown={null} loading={false} />
        </RightPanel>
      </div>
    </div>
  );
};

export default Dashboard;
