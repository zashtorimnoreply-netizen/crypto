import { useState } from 'react';
import { format, startOfYear, subDays, subYears } from 'date-fns';

const DateRangeSelector = ({ startDate, endDate, onDateRangeChange }) => {
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);
  const startOfYearDate = startOfYear(today);
  const oneYearAgo = subYears(today, 1);

  const handlePresetClick = (preset) => {
    let newStart, newEnd;

    switch (preset) {
      case '30D':
        newStart = thirtyDaysAgo;
        newEnd = today;
        break;
      case 'YTD':
        newStart = startOfYearDate;
        newEnd = today;
        break;
      case '1Y':
        newStart = oneYearAgo;
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
      // Validate dates
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

  const getActiveButton = () => {
    const startStr = startDate || '';
    const endStr = endDate || '';

    if (!startStr && !endStr) return 'ALL';

    const thirtyDaysStr = format(thirtyDaysAgo, 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    if (startStr === thirtyDaysStr && endStr === todayStr) return '30D';

    const startOfYearStr = format(startOfYearDate, 'yyyy-MM-dd');
    if (startStr === startOfYearStr && endStr === todayStr) return 'YTD';

    const oneYearStr = format(oneYearAgo, 'yyyy-MM-dd');
    if (startStr === oneYearStr && endStr === todayStr) return '1Y';

    return 'CUSTOM';
  };

  const activeButton = getActiveButton();

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Preset Buttons */}
      <div className="flex gap-2">
        {['30D', 'YTD', '1Y', 'All'].map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetClick(preset)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeButton === preset.toUpperCase()
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Custom Date Range Toggle */}
      <button
        onClick={() => setShowCustom(!showCustom)}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          showCustom || activeButton === 'CUSTOM'
            ? 'bg-gray-800 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Custom
      </button>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm text-gray-600">
              From:
            </label>
            <input
              type="date"
              id="startDate"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm text-gray-600">
              To:
            </label>
            <input
              type="date"
              id="endDate"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCustomDateChange}
            disabled={!customStartDate || !customEndDate}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
};

export default DateRangeSelector;
