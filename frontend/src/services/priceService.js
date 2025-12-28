import api, { retryRequest } from './api';

/**
 * Get current price for a symbol
 */
export const getCurrentPrice = async (symbol) => {
  return retryRequest(() => api.get(`/prices/current/${symbol}`));
};

/**
 * Get current prices for multiple symbols
 */
export const getCurrentPrices = async (symbols) => {
  return retryRequest(() => api.post('/prices/current/batch', { symbols }));
};

/**
 * Get historical prices
 */
export const getHistoricalPrices = async (symbol, startDate, endDate) => {
  return retryRequest(() => 
    api.get(`/prices/historical/${symbol}`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
  );
};

/**
 * Get price at specific date
 */
export const getPriceAtDate = async (symbol, date) => {
  return retryRequest(() => 
    api.get(`/prices/historical/${symbol}`, {
      params: {
        date,
      },
    })
  );
};
