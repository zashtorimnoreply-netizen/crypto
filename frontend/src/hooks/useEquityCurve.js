import { useState, useEffect, useCallback } from 'react';
import { getEquityCurve } from '../services/portfolioService';
import { downsampleEquityCurve } from '../utils/chartDownsampling';

/**
 * Custom hook to fetch and manage equity curve data
 * @param {string} portfolioId - Portfolio ID
 * @param {object} options - Options object containing startDate and endDate
 * @param {string} options.startDate - Start date in YYYY-MM-DD format
 * @param {string} options.endDate - End date in YYYY-MM-DD format
 * @param {number} options.maxChartPoints - Maximum points for chart display (default: 500)
 * @returns {object} Equity curve data, loading state, error, stats, and refetch function
 */
export const useEquityCurve = (portfolioId, options = {}) => {
  const { startDate = null, endDate = null, maxChartPoints = 500 } = options;
  const [curve, setCurve] = useState([]);
  const [rawCurve, setRawCurve] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    minValue: 0,
    maxValue: 0,
    currentValue: 0,
    change: 0,
    changePercent: 0,
    volatility: 0,
  });

  const calculateStats = useCallback((data) => {
    if (!data || data.length === 0) {
      return {
        minValue: 0,
        maxValue: 0,
        currentValue: 0,
        change: 0,
        changePercent: 0,
        volatility: 0,
      };
    }

    const values = data.map(d => d.total_value);
    const startValue = values[0];
    const endValue = values[values.length - 1];
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const change = endValue - startValue;
    const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;

    // Calculate volatility (standard deviation of daily returns)
    let volatility = 0;
    if (values.length > 1) {
      const dailyReturns = [];
      for (let i = 1; i < values.length; i++) {
        if (values[i - 1] > 0) {
          dailyReturns.push((values[i] - values[i - 1]) / values[i - 1]);
        }
      }
      if (dailyReturns.length > 0) {
        const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
        const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / dailyReturns.length;
        volatility = Math.sqrt(variance) * 100;
      }
    }

    return {
      minValue: parseFloat(minValue.toFixed(2)),
      maxValue: parseFloat(maxValue.toFixed(2)),
      currentValue: parseFloat(endValue.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volatility: parseFloat(volatility.toFixed(2)),
    };
  }, []);

  const fetchEquityCurve = useCallback(async (newStartDate = null, newEndDate = null) => {
    if (!portfolioId) {
      setCurve([]);
      setRawCurve([]);
      setStats(calculateStats([]));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = {};
      const useStartDate = newStartDate || startDate;
      const useEndDate = newEndDate || endDate;
      
      if (useStartDate) params.start_date = useStartDate;
      if (useEndDate) params.end_date = useEndDate;
      params.include_stats = 'true';

      const response = await getEquityCurve(portfolioId, params);

      const equityCurveData = response.data || [];
      setRawCurve(equityCurveData);

      // Downsample for chart display if data is large
      const downsampledData = downsampleEquityCurve(equityCurveData, maxChartPoints);
      setCurve(downsampledData);

      // Use stats from API if available, otherwise calculate
      if (response.statistics) {
        const apiStats = response.statistics;
        setStats({
          minValue: apiStats.min_value || 0,
          maxValue: apiStats.max_value || 0,
          currentValue: equityCurveData.length > 0 
            ? equityCurveData[equityCurveData.length - 1].total_value 
            : 0,
          change: apiStats.total_return || 0,
          changePercent: apiStats.total_return_percent || 0,
          volatility: apiStats.volatility_30d || 0,
        });
      } else {
        setStats(calculateStats(equityCurveData));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load equity curve');
      console.error('Error loading equity curve:', err);
      setCurve([]);
      setRawCurve([]);
      setStats(calculateStats([]));
    } finally {
      setLoading(false);
    }
  }, [portfolioId, startDate, endDate, maxChartPoints, calculateStats]);

  useEffect(() => {
    fetchEquityCurve();
  }, [fetchEquityCurve]);

  return {
    curve,
    rawCurve,
    loading,
    error,
    stats,
    refetch: fetchEquityCurve,
  };
};

export default useEquityCurve;
