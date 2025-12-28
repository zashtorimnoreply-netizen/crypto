import api, { retryRequest } from './api';

/**
 * Get all portfolios
 */
export const getPortfolios = async () => {
  return retryRequest(() => api.get('/portfolios'));
};

/**
 * Get portfolio by ID
 */
export const getPortfolio = async (portfolioId) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}`));
};

/**
 * Create a new portfolio
 */
export const createPortfolio = async (data) => {
  return api.post('/portfolios', data);
};

/**
 * Update portfolio
 */
export const updatePortfolio = async (portfolioId, data) => {
  return api.put(`/portfolios/${portfolioId}`, data);
};

/**
 * Delete portfolio
 */
export const deletePortfolio = async (portfolioId) => {
  return api.delete(`/portfolios/${portfolioId}`);
};

/**
 * Get portfolio equity curve
 */
export const getEquityCurve = async (portfolioId, params = {}) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/equity-curve`, { params }));
};

/**
 * Get portfolio summary
 */
export const getPortfolioSummary = async (portfolioId) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/summary`));
};

/**
 * Get portfolio positions
 */
export const getPortfolioPositions = async (portfolioId) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/positions`));
};

/**
 * Get portfolio trades
 */
export const getPortfolioTrades = async (portfolioId, params = {}) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/trades`, { params }));
};

/**
 * Upload CSV trades
 */
export const uploadCSVTrades = async (portfolioId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('portfolio_id', portfolioId);
  
  return api.post('/csv/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * Sync Bybit trades
 */
export const syncBybitTrades = async (portfolioId, apiKey, apiSecret, startTime) => {
  return api.post('/bybit/sync', {
    portfolio_id: portfolioId,
    api_key: apiKey,
    api_secret: apiSecret,
    start_time: startTime,
  });
};
