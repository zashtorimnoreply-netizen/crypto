import api, { retryRequest } from './api';

/**
 * Calculate portfolio metrics
 */
export const calculateMetrics = async (portfolioId, params = {}) => {
  return retryRequest(() => 
    api.get(`/portfolios/${portfolioId}/metrics`, { params })
  );
};

/**
 * Get portfolio allocation
 */
export const getPortfolioAllocation = async (portfolioId) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/allocation`));
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = async (portfolioId, startDate, endDate) => {
  return retryRequest(() => 
    api.get(`/portfolios/${portfolioId}/performance`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
  );
};

/**
 * Get risk metrics
 */
export const getRiskMetrics = async (portfolioId) => {
  return retryRequest(() => api.get(`/portfolios/${portfolioId}/risk`));
};
