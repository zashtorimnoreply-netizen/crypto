import { useState, useCallback } from 'react';
import api, { retryRequest } from '../services/api';

export const useSimulation = () => {
  const [simulationData, setSimulationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runSimulation = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);

      const response = await retryRequest(() => api.post('/simulations/dca', params));
      setSimulationData(response.data);
      return response.data;
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to run simulation';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSimulationData(null);
    setError(null);
  }, []);

  return {
    simulationData,
    loading,
    error,
    runSimulation,
    clearResults,
  };
};

export default useSimulation;
