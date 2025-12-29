import { useState, useCallback, useRef } from 'react';
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
import ExportButton from '../components/UI/ExportButton';

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
  
  // Refs for export functionality
  const metricsRef = useRef(null);
  const equityCurveRef = useRef(null);
  const allocationRef = useRef(null);

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
          <div className="mb-6" ref={metricsRef}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Key Performance Indicators</h2>
              <ExportButton 
                elementRef={metricsRef} 
                filename="portfolio_metrics"
                label="Export Metrics"
              />
            </div>
            <MetricsGrid metrics={metrics} loading={metricsLoading} error={metricsError} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div ref={equityCurveRef}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Equity Curve</h3>
                <ExportButton 
                  elementRef={equityCurveRef} 
                  filename="portfolio_equity_curve"
                  label="Export"
                  className="!py-1 !px-2 text-xs"
                />
              </div>
              <EquityCurveChart
                portfolioName={currentPortfolio?.portfolio_name || 'My Portfolio'}
                data={equityCurve}
                loading={equityCurveLoading}
                error={equityCurveError}
                onRetry={handleEquityDateRangeChange}
                stats={stats}
                showBenchmarks={true}
              />
            </div>
            <div ref={allocationRef}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Allocation</h3>
                <ExportButton 
                  elementRef={allocationRef} 
                  filename="portfolio_allocation"
                  label="Export"
                  className="!py-1 !px-2 text-xs"
                />
              </div>
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
