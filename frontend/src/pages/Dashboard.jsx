import { useState, useCallback } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import useEquityCurve from '../hooks/useEquityCurve';
import { useAllocation } from '../hooks/useAllocation';
import { useMetrics } from '../hooks/useMetrics';
import Header from '../components/Layout/Header';
import LeftPanel from '../components/Layout/LeftPanel';
import RightPanel from '../components/Layout/RightPanel';
import CSVUpload from '../components/Import/CSVUpload';
import BybitSync from '../components/Import/BybitSync';
import EquityCurveChart from '../components/Charts/EquityCurveChart';
import AllocationChart from '../components/Charts/AllocationChart';
import PositionsList from '../components/Charts/PositionsList';
import MetricsGrid from '../components/Metrics/MetricsGrid';
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
  const { metrics, loading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useMetrics(currentPortfolioId);

  const [highlightedSymbol, setHighlightedSymbol] = useState(null);

  const handleImportSuccess = () => {
    refreshPortfolio();
    refetchEquityCurve();
    refetchAllocation();
    refetchMetrics();
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        portfolioName={currentPortfolio?.portfolio_name || 'My Portfolio'}
        lastUpdated={currentPortfolio?.updated_at}
        onRefresh={() => {
          refreshPortfolio();
          refetchMetrics();
        }}
        loading={loading || metricsLoading}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel>
          <CSVUpload portfolioId={currentPortfolioId} onSuccess={handleImportSuccess} />
          <BybitSync portfolioId={currentPortfolioId} onSuccess={handleImportSuccess} />
        </LeftPanel>

        <RightPanel>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Key Performance Indicators</h2>
            <MetricsGrid metrics={metrics} loading={metricsLoading} error={metricsError} />
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

          <RiskIndicators metrics={metrics} loading={metricsLoading} />
        </RightPanel>
      </div>
    </div>
  );
};

export default Dashboard;
