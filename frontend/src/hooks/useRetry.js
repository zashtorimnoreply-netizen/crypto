import { useState, useCallback } from 'react';

/**
 * Custom hook for retrying async operations with exponential backoff
 * @param {Function} asyncFn - The async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Object} State and control functions
 */
export function useRetry(asyncFn, maxRetries = 3) {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null,
    retryCount: 0,
  });

  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const data = await asyncFn(...args);
        setState({
          loading: false,
          data,
          error: null,
          retryCount: 0,
        });
        return data;
      } catch (error) {
        lastError = error;
        
        // If this is not the last attempt, wait before retrying
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    setState({
      loading: false,
      data: null,
      error: lastError,
      retryCount: maxRetries,
    });
    
    throw lastError;
  }, [asyncFn, maxRetries]);

  const retry = useCallback((...args) => {
    return execute(...args);
  }, [execute]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
      retryCount: 0,
    });
  }, []);

  return { 
    ...state, 
    execute, 
    retry,
    reset,
    isRetrying: state.loading && state.retryCount > 0
  };
}

export default useRetry;
