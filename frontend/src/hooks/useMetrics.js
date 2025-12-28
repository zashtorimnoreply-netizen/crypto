import { useState, useEffect, useCallback } from 'react';
import { calculateMetrics, getPortfolioAllocation } from '../services/metricsService';

export const useMetrics = (portfolioId, params = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await calculateMetrics(portfolioId, params);
      setMetrics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, JSON.stringify(params)]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return { metrics, loading, error, refetch: loadMetrics };
};

export const useAllocation = (portfolioId) => {
  const [allocation, setAllocation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAllocation = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolioAllocation(portfolioId);
      setAllocation(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load allocation');
      console.error('Error loading allocation:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    loadAllocation();
  }, [loadAllocation]);

  return { allocation, loading, error, refetch: loadAllocation };
};
