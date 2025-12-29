import { useState } from 'react';
import { format, startOfYear, subYears } from 'date-fns';
import Button from '../UI/Button';
import Tooltip from '../UI/Tooltip';
import { TOOLTIPS } from '../../utils/tooltips';

const DateRangeComparisonSelector = ({ 
  startDate, 
  endDate, 
  onDateRangeChange,
  className = '' 
}) => {
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const today = new Date();
  const startOfYearDate = startOfYear(today);
  const oneYearAgo = subYears(today, 1);
  const threeYearsAgo = subYears(today, 3);
  const fiveYearsAgo = subYears(today, 5);

  const handlePresetClick = (preset) => {
    let newStart, newEnd;

    switch (preset) {
      case 'YTD':
        newStart = startOfYearDate;
        newEnd = today;
        break;
      case '1Y':
        newStart = oneYearAgo;
        newEnd = today;
        break;
      case '3Y':
        newStart = threeYearsAgo;
        newEnd = today;
        break;
      case '5Y':
        newStart = fiveYearsAgo;
        newEnd = today;
        break;
      case 'ALL':
        newStart = null;
        newEnd = null;
        break;
      default:
        return;
    }

    const startDateStr = newStart ? format(newStart, 'yyyy-MM-dd') : null;
    const endDateStr = newEnd ? format(newEnd, 'yyyy-MM-dd') : null;

    setCustomStartDate(startDateStr || '');
    setCustomEndDate(endDateStr || '');
    onDateRangeChange(startDateStr, endDateStr);
  };

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const now = new Date();

      if (start > end) {
        alert('Start date must be before end date');
        return;
      }

      if (end > now) {
        alert('End date cannot be in the future');
        return;
      }

      onDateRangeChange(customStartDate, customEndDate);
    }
  };

  const getActivePreset = () => {
    const startStr = startDate || '';
    const endStr = endDate || '';

    if (!startStr && !endStr) return 'ALL';

    const todayStr = format(today, 'yyyy-MM-dd');
    const startOfYearStr = format(startOfYearDate, 'yyyy-MM-dd');

    if (startStr === startOfYearStr && endStr === todayStr) return 'YTD';

    const oneYearStr = format(oneYearAgo, 'yyyy-MM-dd');
    if (startStr === oneYearStr && endStr === todayStr) return '1Y';

    const threeYearStr = format(threeYearsAgo, 'yyyy-MM-dd');
    if (startStr === threeYearStr && endStr === todayStr) return '3Y';

    const fiveYearStr = format(fiveYearsAgo, 'yyyy-MM-dd');
    if (startStr === fiveYearStr && endStr === todayStr) return '5Y';

    return 'CUSTOM';
  };

  const activePreset = getActivePreset();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Preset Buttons */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          Quick Select
          <Tooltip content={TOOLTIPS.dateRange} position="right" multiline maxWidth="max-w-md">
            <span className="text-gray-400 text-xs cursor-help hover:text-gray-600">ⓘ</span>
          </Tooltip>
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'YTD', label: 'YTD' },
            { key: '1Y', label: '1Y' },
            { key: '3Y', label: '3Y' },
            { key: '5Y', label: '5Y' },
            { key: 'ALL', label: 'All' },
          ].map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetClick(preset.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activePreset === preset.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Toggle */}
      <div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`text-sm font-medium transition-colors ${
            showCustom || activePreset === 'CUSTOM'
              ? 'text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {showCustom ? 'Hide Custom Range' : 'Custom Range'}
        </button>
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="comparisonStartDate" className="block text-sm text-gray-600 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="comparisonStartDate"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="comparisonEndDate" className="block text-sm text-gray-600 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="comparisonEndDate"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={handleCustomDateChange}
              disabled={!customStartDate || !customEndDate}
              size="sm"
            >
              Apply Range
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeComparisonSelector;
