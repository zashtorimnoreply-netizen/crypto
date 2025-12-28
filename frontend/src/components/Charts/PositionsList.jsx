import { useState, useMemo } from 'react';
import { 
  FiArrowUp, 
  FiArrowDown, 
  FiChevronUp, 
  FiChevronDown,
  FiMinus 
} from 'react-icons/fi';
import { formatCurrency, formatSymbol } from '../../utils/formatters';
import Card from '../UI/Card';
import Loading from '../UI/Loading';
import Error from '../UI/Error';

// Helper component for sort indicator
const SortIcon = ({ field, sortBy, sortOrder }) => {
  if (sortBy !== field) {
    return <FiMinus className="w-3 h-3 text-gray-300" />;
  }
  return sortOrder === 'asc' ? (
    <FiChevronUp className="w-4 h-4 text-blue-600" />
  ) : (
    <FiChevronDown className="w-4 h-4 text-blue-600" />
  );
};

// Helper component for PnL display
const PnLIndicator = ({ pnl }) => {
  if (!pnl) return null;
  
  const isPositive = pnl.value >= 0;
  const isNeutral = pnl.value === 0;
  
  return (
    <div className={`flex items-center gap-1 ${
      isNeutral ? 'text-gray-600' : isPositive ? 'text-green-600' : 'text-red-600'
    }`}>
      {!isNeutral && (
        isPositive ? <FiArrowUp className="w-4 h-4" /> : <FiArrowDown className="w-4 h-4" />
      )}
      <span className="font-semibold">
        {isPositive && !isNeutral ? '+' : ''}{formatCurrency(pnl.value)}
      </span>
      <span className="text-sm">
        ({isPositive && !isNeutral ? '+' : ''}{pnl.percent.toFixed(2)}%)
      </span>
    </div>
  );
};

// Helper function for formatting holdings
const formatHoldings = (holdings) => {
  // Show more decimals for crypto assets
  const decimals = holdings < 1 ? 8 : holdings < 10 ? 6 : 4;
  return holdings.toFixed(decimals).replace(/\.?0+$/, '');
};

const PositionsList = ({ 
  positions = [], 
  loading, 
  error, 
  onRetry, 
  onPositionClick,
  highlightedSymbol 
}) => {
  const [sortBy, setSortBy] = useState('value'); // value, symbol, percent, pnl
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new field (except symbol)
      setSortBy(field);
      setSortOrder(field === 'symbol' ? 'asc' : 'desc');
    }
  };

  const sortedPositions = useMemo(() => {
    if (!positions || positions.length === 0) return [];

    const sorted = [...positions].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol;
          bValue = b.symbol;
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        
        case 'value':
          aValue = a.position_value;
          bValue = b.position_value;
          break;
        
        case 'percent':
          aValue = a.percent_of_portfolio;
          bValue = b.percent_of_portfolio;
          break;
        
        case 'pnl':
          aValue = a.pnl.value;
          bValue = b.pnl.value;
          break;
        
        default:
          aValue = a.position_value;
          bValue = b.position_value;
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [positions, sortBy, sortOrder]);

  if (loading) {
    return (
      <Card title="Positions">
        <div className="py-12">
          <Loading size="md" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Positions">
        <Error message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <Card title="Positions">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No positions yet</p>
          <p className="text-sm text-gray-400">
            Import trades to see your portfolio positions
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="Positions" subtitle={`${positions.length} asset${positions.length !== 1 ? 's' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th 
                className="text-left py-3 px-4 font-semibold text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center gap-2">
                  Symbol
                  <SortIcon field="symbol" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                Holdings
              </th>
              <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">
                Price
              </th>
              <th 
                className="text-right py-3 px-4 font-semibold text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center justify-end gap-2">
                  Value
                  <SortIcon field="value" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              <th 
                className="text-right py-3 px-4 font-semibold text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('percent')}
              >
                <div className="flex items-center justify-end gap-2">
                  % of Portfolio
                  <SortIcon field="percent" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
              <th 
                className="text-right py-3 px-4 font-semibold text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort('pnl')}
              >
                <div className="flex items-center justify-end gap-2">
                  PnL
                  <SortIcon field="pnl" sortBy={sortBy} sortOrder={sortOrder} />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((position, index) => (
              <tr
                key={position.symbol}
                onClick={() => onPositionClick?.(position.symbol)}
                className={`
                  border-b border-gray-100 transition-colors cursor-pointer
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  ${highlightedSymbol === position.symbol ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-100'}
                `}
              >
                <td className="py-3 px-4">
                  <span className="font-semibold text-gray-900">
                    {formatSymbol(position.symbol)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right text-gray-700 font-mono">
                  {formatHoldings(position.holdings, position.symbol)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {formatCurrency(position.current_price)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">
                  {formatCurrency(position.position_value)}
                </td>
                <td className="py-3 px-4 text-right text-gray-700">
                  {position.percent_of_portfolio.toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-right">
                  <PnLIndicator pnl={position.pnl} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default PositionsList;
