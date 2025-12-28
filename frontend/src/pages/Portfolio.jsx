import { useState } from 'react';
import { usePortfolioContext } from '../context/PortfolioContext';
import { useAllocation } from '../hooks/useAllocation';
import Header from '../components/Layout/Header';
import LeftPanel from '../components/Layout/LeftPanel';
import RightPanel from '../components/Layout/RightPanel';
import AllocationChart from '../components/Charts/AllocationChart';
import PositionsList from '../components/Charts/PositionsList';
import Loading from '../components/UI/Loading';
import { formatCurrency, formatRelativeTime } from '../utils/formatters';

const Portfolio = () => {
  const { currentPortfolio, currentPortfolioId, loading, refreshPortfolio } = usePortfolioContext();
  const { 
    allocation, 
    positions, 
    totalValue,
    loading: allocationLoading, 
    error: allocationError, 
    lastUpdated,
    refetch: refetchAllocation 
  } = useAllocation(currentPortfolioId);

  const [highlightedSymbol, setHighlightedSymbol] = useState(null);

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
          refetchAllocation();
        }}
        loading={loading || allocationLoading}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <LeftPanel>
          <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Summary</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totalValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Positions</p>
                <p className="text-lg font-semibold text-gray-900">
                  {positions?.length || 0}
                </p>
              </div>
              {lastUpdated && (
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-700">
                    {formatRelativeTime(lastUpdated)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </LeftPanel>

        <RightPanel>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Asset Allocation</h2>
            <p className="text-gray-600 mb-6">
              View your portfolio distribution across different assets. Click on a pie slice or table row to highlight.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
            <div className="lg:col-span-2">
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
            <div className="lg:col-span-3">
              <PositionsList
                positions={positions}
                loading={allocationLoading}
                error={allocationError}
                onRetry={refetchAllocation}
                onPositionClick={handlePositionClick}
                highlightedSymbol={highlightedSymbol}
              />
            </div>
          </div>
        </RightPanel>
      </div>
    </div>
  );
};

export default Portfolio;
