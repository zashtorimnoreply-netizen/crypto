import { useState, useEffect, useCallback } from 'react';
import { getPortfolio, getEquityCurve, getPortfolioSummary } from '../services/portfolioService';

export const usePortfolio = (portfolioId) => {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPortfolio = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolio(portfolioId);
      setPortfolio(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load portfolio');
      console.error('Error loading portfolio:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  return { portfolio, loading, error, refetch: loadPortfolio };
};

export const useEquityCurve = (portfolioId, params = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEquityCurve = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getEquityCurve(portfolioId, params);
      setData(response.data?.equity_curve || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load equity curve');
      console.error('Error loading equity curve:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, JSON.stringify(params)]);

  useEffect(() => {
    loadEquityCurve();
  }, [loadEquityCurve]);

  return { data, loading, error, refetch: loadEquityCurve };
};

export const usePortfolioSummary = (portfolioId) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSummary = useCallback(async () => {
    if (!portfolioId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolioSummary(portfolioId);
      setSummary(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load summary');
      console.error('Error loading summary:', err);
    } finally {
      setLoading(false);
    }
  }, [portfolioId]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  return { summary, loading, error, refetch: loadSummary };
};
