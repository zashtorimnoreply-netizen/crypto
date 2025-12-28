import { useState, useCallback } from 'react';
import { format, startOfYear } from 'date-fns';
import { usePortfolioContext } from '../context/PortfolioContext';
import useComparisonData from '../hooks/useComparisonData';
import Header from '../components/Layout/Header';
import LeftPanel from '../components/Layout/LeftPanel';
import RightPanel from '../components/Layout/RightPanel';
import Loading from '../components/UI/Loading';
import DateRangeComparisonSelector from '../components/Comparison/DateRangeComparisonSelector';
import ComparisonChartsView from '../components/Comparison/ComparisonChartsView';
import ComparisonMetricsTable from '../components/Comparison/ComparisonMetricsTable';

const ComparisonPage = () => {
  const { currentPortfolio, currentPortfolioId, loading: portfolioLoading } = usePortfolioContext();
  
  const [startDate, setStartDate] = useState(() => {
    const ytd = startOfYear(new Date());
    return format(ytd, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    return format(new Date(), 'yyyy-MM-dd');
  });

  const {
    chartData,
    metricsData,
    loading: comparisonLoading,
    error: comparisonError,
    refetch,
  } = useComparisonData(currentPortfolioId, startDate, endDate);

  const loading = portfolioLoading || comparisonLoading;

  const handleDateRangeChange = useCallback((newStart, newEnd) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    refetch(newStart, newEnd);
  }, [refetch]);

  const handleRefresh = useCallback(() => {
    refetch(startDate, endDate);
  }, [refetch, startDate, endDate]);

  if (portfolioLoading && !currentPortfolio) {
    return <Loading fullScreen text="Loading portfolio..." />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        portfolioName={currentPortfolio?.portfolio_name ? `${currentPortfolio.portfolio_name} - Comparison` : 'Portfolio Comparison'}
        onRefresh={handleRefresh}
        loading={loading}
      />

      <div className="flex flex-1 overflow-hidden">
        <LeftPanel>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
                Date Range
              </h3>
              <DateRangeComparisonSelector
                startDate={startDate}
                endDate={endDate}
                onDateRangeChange={handleDateRangeChange}
              />
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">About Comparison</h4>
              <p className="text-xs text-blue-700">
                Compare your portfolio performance against preset strategies:
              </p>
              <ul className="mt-2 text-xs text-blue-600 space-y-1">
                <li><strong>BTC 100%</strong> - Full Bitcoin exposure</li>
                <li><strong>BTC/ETH 70/30</strong> - 70% BTC, 30% ETH allocation</li>
              </ul>
            </div>

            {comparisonError && (
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">{comparisonError}</p>
              </div>
            )}
          </div>
        </LeftPanel>

        <RightPanel>
          <div className="space-y-6">
            {/* Comparison Chart */}
            <ComparisonChartsView
              data={chartData}
              loading={comparisonLoading}
              error={comparisonError}
              onRetry={handleRefresh}
            />

            {/* Metrics Table */}
            <ComparisonMetricsTable
              data={metricsData}
              loading={comparisonLoading}
              error={comparisonError}
            />
          </div>
        </RightPanel>
      </div>
    </div>
  );
};

export default ComparisonPage;
