import { FiCheck, FiX, FiLoader } from 'react-icons/fi';

const ImportStatus = ({ status, message, count }) => {
  const statusConfig = {
    success: {
      icon: FiCheck,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
    },
    error: {
      icon: FiX,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      textColor: 'text-red-800',
    },
    loading: {
      icon: FiLoader,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-800',
    },
  };

  const config = statusConfig[status] || statusConfig.loading;
  const Icon = config.icon;

  return (
    <div className={`p-4 ${config.bgColor} border ${config.borderColor} rounded-lg`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 ${config.iconColor} ${status === 'loading' ? 'animate-spin' : ''} mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.textColor}`}>
            {message}
          </p>
          {count !== undefined && (
            <p className={`text-xs ${config.textColor} mt-1`}>
              {count} trades imported
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportStatus;
