const TrafficLight = ({ color, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const colorClasses = {
    green: 'bg-[#10B981]',
    yellow: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
    gray: 'bg-gray-400',
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full shadow-sm`}
      aria-label={`${color} indicator`}
    />
  );
};

export default TrafficLight;
