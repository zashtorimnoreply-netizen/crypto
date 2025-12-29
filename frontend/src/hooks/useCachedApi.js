import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for caching API responses with stale-while-revalidate pattern
 * @param {string} cacheKey - Unique key for this cache entry
 * @param {Function} fetcher - Async function to fetch data
 * @param {object} options - Configuration options
 * @param {number} options.cacheTime - Cache duration in ms (default: 5 minutes)
 * @param {boolean} options.staleWhileRevalidate - Enable SWR pattern (default: true)
 * @param {boolean} options.immediate - Fetch immediately on mount (default: true)
 * @returns {object} { data, loading, error, refetch, isStale }
 */
export function useCachedApi(cacheKey, fetcher, options = {}) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate = true,
    immediate = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [isStale, setIsStale] = useState(false);
  const [fetchCount, setFetchCount] = useState(0);
  
  const lastFetchRef = useRef(0);
  const cacheDataRef = useRef(null);

  // Get data from localStorage cache
  const getCached = useCallback(() => {
    try {
      const cached = localStorage.getItem(`cache:${cacheKey}`);
      if (cached) {
        const { data: cachedData, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < cacheTime) {
          return { data: cachedData, age, isFresh: age < cacheTime };
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }, [cacheKey, cacheTime]);

  // Save to localStorage cache
  const setCached = useCallback((newData) => {
    try {
      localStorage.setItem(`cache:${cacheKey}`, JSON.stringify({
        data: newData,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn('Cache write error:', e);
    }
  }, [cacheKey]);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCached();
      if (cached && cached.isFresh) {
        setData(cached.data);
        setLoading(false);
        setIsStale(false);
        cacheDataRef.current = cached.data;
        return cached.data;
      }
      
      // If stale data exists and SWR is enabled, return stale data while revalidating
      if (cached && staleWhileRevalidate) {
        setData(cached.data);
        setIsStale(true);
        cacheDataRef.current = cached.data;
      }
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await fetcher();
      const dataWithTimestamp = {
        ...result,
        _cachedAt: now,
      };
      
      setData(dataWithTimestamp);
      setCached(dataWithTimestamp);
      setIsStale(false);
      setFetchCount(prev => prev + 1);
      cacheDataRef.current = dataWithTimestamp;
      lastFetchRef.current = now;
      
      return dataWithTimestamp;
    } catch (err) {
      setError(err);
      // If we have cached data, don't overwrite it with error
      if (!cacheDataRef.current) {
        setData(null);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetcher, getCached, setCached, staleWhileRevalidate]);

  // Initial fetch
  useEffect(() => {
    if (!immediate) return;
    
    const cached = getCached();
    
    // If we have fresh cached data, use it immediately
    if (cached && cached.isFresh) {
      setData(cached.data);
      setLoading(false);
      cacheDataRef.current = cached.data;
      return;
    }
    
    // Start fetch (will use stale data if available)
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]); // Only re-run if cacheKey changes

  // Periodic revalidation when stale
  useEffect(() => {
    if (!staleWhileRevalidate || !data) return;

    const interval = setInterval(() => {
      const cached = getCached();
      if (cached && !cached.isFresh) {
        // Revalidate in background
        fetchData().catch(() => {}); // Silently fail revalidation
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, staleWhileRevalidate]); // fetchData and getCached are stable

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    isStale,
    fetchCount,
  };
}

/**
 * Hook for caching preset data (longer cache time)
 */
export function usePresetCache(presetKey, fetcher) {
  return useCachedApi(`preset:${presetKey}`, fetcher, {
    cacheTime: 60 * 60 * 1000, // 1 hour for presets
    staleWhileRevalidate: true,
  });
}

/**
 * Hook for caching price data (shorter cache time)
 */
export function usePriceCache(symbols, fetcher) {
  const cacheKey = `prices:${symbols.sort().join(',')}`;
  
  return useCachedApi(cacheKey, fetcher, {
    cacheTime: 60 * 1000, // 1 minute for prices
    staleWhileRevalidate: true,
  });
}

/**
 * Hook for memoizing expensive calculations
 */
export function useMemoizedCalculation(dependencies, calculator, memoTime = 1000) {
  const [result, setResult] = useState(null);
  const [computing, setComputing] = useState(false);
  const lastComputeRef = useRef(0);
  const depsRef = useRef(dependencies);

  // Update dependencies
  depsRef.current = dependencies;

  useEffect(() => {
    const now = Date.now();
    
    // Check if we need to recompute
    const depsChanged = !dependencies.every((dep, i) => dep === depsRef.current[i]);
    
    if (!depsChanged && result && now - lastComputeRef.current < memoTime) {
      return; // Use cached result
    }

    setComputing(true);
    
    // Use setTimeout to avoid blocking
    const timer = setTimeout(() => {
      try {
        const newResult = calculator();
        setResult(newResult);
        lastComputeRef.current = now;
      } catch (err) {
        console.error('Calculation error:', err);
      } finally {
        setComputing(false);
      }
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies); // calculator and memoTime are expected to be stable

  return { result, computing };
}

export default useCachedApi;
