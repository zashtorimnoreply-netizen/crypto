import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiShare2 } from 'react-icons/fi';
import { ShareDialog } from '../UI';
import useSharing from '../../hooks/useSharing';

const ShareButton = ({ portfolioId, portfolioName, variant = 'header' }) => {
  const [showDialog, setShowDialog] = useState(false);
  useSharing(portfolioId); // Use the hook to maintain state

  // Get portfolioId from URL for pages that use route params
  const params = useParams();
  const activePortfolioId = portfolioId || params.portfolioId;

  const handleShareClick = () => {
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const isDisabled = !activePortfolioId;

  // Get portfolio context name or use provided name
  const displayName = portfolioName || (params.portfolioId ? 'Portfolio' : 'My Portfolio');

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleShareClick}
          className="ml-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          disabled={isDisabled}
          title={isDisabled ? "Please select a portfolio first" : "Share portfolio"}
        >
          <FiShare2 className="w-4 h-4 mr-2" />
          Share
        </button>
        
        <ShareDialog
          isOpen={showDialog}
          onClose={handleCloseDialog}
          portfolioId={activePortfolioId}
          portfolioName={displayName}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleShareClick}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        disabled={isDisabled}
        title={isDisabled ? "Please select a portfolio first" : "Share portfolio"}
      >
        <FiShare2 className="w-4 h-4" />
        <span className="ml-2">Share Portfolio</span>
      </button>
      
      <ShareDialog
        isOpen={showDialog}
        onClose={handleCloseDialog}
        portfolioId={activePortfolioId}
        portfolioName={displayName}
      />
    </>
  );
};

export default ShareButton;