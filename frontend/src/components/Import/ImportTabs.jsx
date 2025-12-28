import { useState } from 'react';
import { FiUpload, FiRefreshCw } from 'react-icons/fi';
import CSVUpload from './CSVUpload';
import BybitSync from './BybitSync';

const ImportTabs = ({ portfolioId, onCSVSuccess, onBybitSuccess }) => {
  const [activeTab, setActiveTab] = useState('csv');

  const tabs = [
    {
      id: 'csv',
      label: 'Upload CSV',
      icon: FiUpload,
      component: (
        <CSVUpload
          portfolioId={portfolioId}
          onSuccess={onCSVSuccess}
        />
      ),
    },
    {
      id: 'bybit',
      label: 'Sync Bybit',
      icon: FiRefreshCw,
      component: (
        <BybitSync
          portfolioId={portfolioId}
          onSuccess={onBybitSuccess}
        />
      ),
    },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`
              }
              className={`
                flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                ${isActive
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300 -mb-px'
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div 
        role="tabpanel" 
        id={`${activeTab}-panel`}
        className="pt-6 animate-fadeIn"
      >
        {activeTabData?.component}
      </div>
    </div>
  );
};

export default ImportTabs;
