import Tooltip from '../UI/Tooltip';
import TrafficLight from '../UI/TrafficLight';

const MetricsCard = ({ 
  title, 
  value, 
  subValue,
  description, 
  trafficLightColor = 'gray',
  tooltip,
  valueColor,
  loading = false
}) => {
  const getValueColorClass = () => {
    if (valueColor === 'green') return 'text-green-600';
    if (valueColor === 'red') return 'text-red-600';
    return 'text-gray-900';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer">
      {/* Header with title and traffic light */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          {tooltip && (
            <Tooltip content={tooltip} position="right" multiline maxWidth="max-w-sm">
              <span className="text-gray-400 text-xs cursor-help hover:text-gray-600">ⓘ</span>
            </Tooltip>
          )}
        </div>
        <TrafficLight color={trafficLightColor} size="md" />
      </div>

      {/* Main value */}
      <div className={`text-3xl font-bold mb-2 ${getValueColorClass()}`}>
        {value}
      </div>

      {/* Sub-value (if provided) */}
      {subValue && (
        <div className="text-sm text-gray-600 mb-3">
          {subValue}
        </div>
      )}

      {/* Description */}
      <div className="text-xs text-gray-500 leading-relaxed">
        {description}
      </div>
    </div>
  );
};

export default MetricsCard;
