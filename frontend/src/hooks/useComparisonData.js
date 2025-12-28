import { useState, useCallback, useMemo } from 'react';
import { getEquityCurve, getPresetSimulation } from '../services/portfolioService';

const PRESET_BTC_100 = 'btc-100';
const PRESET_BTC_ETH_70_30 = 'btc-eth-70-30';

/**
 * Custom hook to fetch and manage comparison data between user portfolio and presets
 * @param {string} portfolioId - Portfolio ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {object} Comparison data, loading state, error, refetch function, and transformed data
 */
export const useComparisonData = (portfolioId, startDate, endDate) => {
  const [portfolioData, setPortfolioData] = useState([]);
  const [presetData, setPresetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async (newStartDate, newEndDate) => {
    if (!portfolioId) {
      setPortfolioData([]);
      setPresetData([]);
      setLoading(false);
      return;
    }

    const useStartDate = newStartDate || startDate;
    const useEndDate = newEndDate || endDate;

    try {
      setLoading(true);
      setError(null);

      // Parallel fetch: user portfolio + both presets
      const [portfolioResponse, btc100Response, btcEthResponse] = await Promise.all([
        getEquityCurve(portfolioId, { 
          start_date: useStartDate, 
          end_date: useEndDate,
          include_stats: 'true' 
        }),
        getPresetSimulation(PRESET_BTC_100, useStartDate, useEndDate),
        getPresetSimulation(PRESET_BTC_ETH_70_30, useStartDate, useEndDate),
      ]);

      setPortfolioData(portfolioResponse.data || []);
      setPresetData([
        { id: PRESET_BTC_100, name: 'BTC 100%', data: btc100Response.data },
        { id: PRESET_BTC_ETH_70_30, name: 'BTC/ETH 70/30', data: btcEthResponse.data },
      ]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load comparison data');
      console.error('Error loading comparison data:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, startDate, endDate]);

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!portfolioData.length && !presetData.length) return [];

    const result = [];
    const portfolioMap = new Map(portfolioData.map(item => [item.date, item]));
    const btc100Map = new Map((presetData[0]?.data?.dailyData || []).map(item => [item.date, item]));
    const btcEthMap = new Map((presetData[1]?.data?.dailyData || []).map(item => [item.date, item]));

    // Get all unique dates
    const allDates = new Set([
      ...portfolioData.map(d => d.date),
      ...(presetData[0]?.data?.dailyData || []).map(d => d.date),
      ...(presetData[1]?.data?.dailyData || []).map(d => d.date),
    ]);

    const sortedDates = Array.from(allDates).sort();

    sortedDates.forEach(date => {
      const portfolioItem = portfolioMap.get(date);
      const btc100Item = btc100Map.get(date);
      const btcEthItem = btcEthMap.get(date);

      result.push({
        date,
        portfolio: portfolioItem?.total_value || null,
        btc100: btc100Item?.value || btc100Item?.total_value || null,
        btcEth70_30: btcEthItem?.value || btcEthItem?.total_value || null,
      });
    });

    return result;
  }, [portfolioData, presetData]);

  // Extract metrics for table
  const metricsData = useMemo(() => {
    const portfolioStats = portfolioData.length > 0 ? portfolioData[portfolioData.length - 1] : null;
    const btc100Stats = presetData[0]?.data?.results || {};
    const btcEthStats = presetData[1]?.data?.results || {};

    // Calculate PnL from daily data
    const calculatePnL = (data) => {
      if (!data || data.length === 0) return { value: 0, percent: 0 };
      const startValue = data[0].total_value || data[0].value || 0;
      const endValue = data[data.length - 1].total_value || data[data.length - 1].value || 0;
      const value = endValue - startValue;
      const percent = startValue > 0 ? (value / startValue) * 100 : 0;
      return { value, percent };
    };

    const portfolioPnL = calculatePnL(portfolioData);
    const btc100PnL = calculatePnL(presetData[0]?.data?.dailyData || []);
    const btcEthPnL = calculatePnL(presetData[1]?.data?.dailyData || []);

    return {
      totalValue: {
        portfolio: portfolioStats?.total_value || portfolioStats?.value || 0,
        btc100: btc100Stats.final_value || 0,
        btcEth70_30: btcEthStats.final_value || 0,
      },
      pnl: {
        portfolio: { value: portfolioPnL.value, percent: portfolioPnL.percent },
        btc100: { value: btc100PnL.value, percent: btc100PnL.percent },
        btcEth70_30: { value: btcEthPnL.value, percent: btcEthPnL.percent },
      },
      volatility: {
        portfolio: portfolioStats?.volatility_30d || btc100Stats.volatility || 0,
        btc100: btc100Stats.volatility || 0,
        btcEth70_30: btcEthStats.volatility || 0,
      },
      maxDrawdown: {
        portfolio: portfolioStats?.max_drawdown || btc100Stats.max_drawdown || 0,
        btc100: btc100Stats.max_drawdown || 0,
        btcEth70_30: btcEthStats.max_drawdown || 0,
      },
      cagr: {
        portfolio: btc100Stats.cagr || 0, // API might provide this
        btc100: btc100Stats.cagr || 0,
        btcEth70_30: btcEthStats.cagr || 0,
      },
      ytdReturn: {
        portfolio: portfolioStats?.ytd_return || 0,
        btc100: btc100Stats.ytd_return || 0,
        btcEth70_30: btcEthStats.ytd_return || 0,
      },
    };
  }, [portfolioData, presetData]);

  return {
    portfolioData,
    presetData,
    loading,
    error,
    refetch,
    chartData,
    metricsData,
  };
};

export default useComparisonData;
