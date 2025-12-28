import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPortfolio, getPortfolios } from '../services/portfolioService';

const PortfolioContext = createContext();

export const usePortfolioContext = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [portfolios, setPortfolios] = useState([]);
  const [currentPortfolio, setCurrentPortfolio] = useState(null);
  const [currentPortfolioId, setCurrentPortfolioId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load all portfolios
  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolios();
      setPortfolios(response.data || []);
      
      // If no current portfolio selected, select the first one
      if (!currentPortfolioId && response.data?.length > 0) {
        setCurrentPortfolioId(response.data[0].portfolio_id);
      }
    } catch (err) {
      console.error('Error loading portfolios:', err);
      setError(err.response?.data?.error || 'Failed to load portfolios');
    } finally {
      setLoading(false);
    }
  }, [currentPortfolioId]);

  // Load specific portfolio
  const loadPortfolio = useCallback(async (portfolioId) => {
    if (!portfolioId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await getPortfolio(portfolioId);
      setCurrentPortfolio(response.data);
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError(err.response?.data?.error || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh current portfolio
  const refreshPortfolio = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    if (currentPortfolioId) {
      loadPortfolio(currentPortfolioId);
    }
  }, [currentPortfolioId, loadPortfolio]);

  // Switch to different portfolio
  const switchPortfolio = useCallback((portfolioId) => {
    setCurrentPortfolioId(portfolioId);
    loadPortfolio(portfolioId);
  }, [loadPortfolio]);

  // Load portfolios on mount
  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  // Load current portfolio when ID changes
  useEffect(() => {
    if (currentPortfolioId) {
      loadPortfolio(currentPortfolioId);
    }
  }, [currentPortfolioId, refreshTrigger, loadPortfolio]);

  const value = {
    portfolios,
    currentPortfolio,
    currentPortfolioId,
    loading,
    error,
    refreshPortfolio,
    switchPortfolio,
    loadPortfolios,
    setCurrentPortfolioId,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
};

export default PortfolioContext;
