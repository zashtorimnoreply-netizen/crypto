import { useState, useEffect, useCallback } from 'react';
import { getPortfolioAllocation } from '../services/metricsService';
import { getPortfolioPositions } from '../services/portfolioService';

/**
 * Custom hook for fetching portfolio allocation and positions data
 * @param {string} portfolioId - Portfolio UUID
 * @returns {object} Allocation data, positions, loading state, error, and refetch function
 */
export const useAllocation = (portfolioId) => {
  const [allocation, setAllocation] = useState([]);
  const [positions, setPositions] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAllocation = useCallback(async () => {
    if (!portfolioId) {
      setAllocation([]);
      setPositions([]);
      setTotalValue(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch both allocation and positions in parallel
      const [allocationResponse, positionsResponse] = await Promise.all([
        getPortfolioAllocation(portfolioId),
        getPortfolioPositions(portfolioId),
      ]);

      // Process allocation data
      const allocationData = allocationResponse.data?.allocation || [];
      setAllocation(allocationData);
      setTotalValue(allocationResponse.data?.current_value || 0);
      setLastUpdated(allocationResponse.data?.last_updated || new Date().toISOString());

      // Process positions data with enhanced information
      const positionsData = positionsResponse.data?.positions || [];
      setPositions(positionsData);

    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to load allocation data';
      setError(errorMessage);
      console.error('Error loading allocation:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    fetchAllocation();
  }, [fetchAllocation]);

  return { 
    allocation, 
    positions,
    totalValue,
    loading, 
    error, 
    lastUpdated,
    refetch: fetchAllocation 
  };
};
