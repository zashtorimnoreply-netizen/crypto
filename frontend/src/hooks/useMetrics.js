import { useState, useEffect, useCallback } from 'react';
import { calculateMetrics, getPortfolioAllocation, getPortfolioSummary } from '../services/metricsService';

export const useMetrics = (portfolioId, params = {}) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      
      // Try to get portfolio summary which includes metrics
      let response;
      try {
        response = await getPortfolioSummary(portfolioId);
      } catch {
        // Fall back to old metrics endpoint if summary doesn't exist
        response = await calculateMetrics(portfolioId, params);
      }
      
      setMetrics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load metrics');
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, params]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!portfolioId) return;
    
    const interval = setInterval(() => {
      loadMetrics();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [portfolioId, loadMetrics]);

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
