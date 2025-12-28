import { useState, useEffect, useCallback } from 'react';
import { getCurrentPrice, getCurrentPrices, getHistoricalPrices } from '../services/priceService';

export const useCurrentPrice = (symbol) => {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrice = useCallback(async () => {
    if (!symbol) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getCurrentPrice(symbol);
      setPrice(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load price');
      console.error('Error loading price:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    loadPrice();
  }, [loadPrice]);

  return { price, loading, error, refetch: loadPrice };
};

export const useCurrentPrices = (symbols) => {
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrices = useCallback(async () => {
    if (!symbols || symbols.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getCurrentPrices(symbols);
      setPrices(response.data || {});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load prices');
      console.error('Error loading prices:', err);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(symbols)]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  return { prices, loading, error, refetch: loadPrices };
};

export const useHistoricalPrices = (symbol, startDate, endDate) => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrices = useCallback(async () => {
    if (!symbol || !startDate || !endDate) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getHistoricalPrices(symbol, startDate, endDate);
      setPrices(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load historical prices');
      console.error('Error loading historical prices:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol, startDate, endDate]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  return { prices, loading, error, refetch: loadPrices };
};
