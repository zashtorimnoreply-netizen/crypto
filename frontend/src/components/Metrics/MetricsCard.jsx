import { FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import Tooltip from '../UI/Tooltip';

const MetricsCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'percentage', 
  icon: Icon,
  tooltip,
  trend 
}) => {
  const getTrendColor = () => {
    if (!change || change === 0) return 'text-gray-600';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTrendIcon = () => {
    if (!change || change === 0) return null;
    return change > 0 ? <FiTrendingUp /> : <FiTrendingDown />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            {tooltip && <Tooltip content={tooltip}><span className="text-gray-400 text-xs cursor-help">ⓘ</span></Tooltip>}
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {changeType === 'percentage' ? `${change > 0 ? '+' : ''}${change.toFixed(2)}%` : change}
              </span>
              {trend && <span className="text-xs text-gray-500 ml-1">{trend}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricsCard;
