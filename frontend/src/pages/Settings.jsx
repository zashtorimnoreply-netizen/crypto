import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';

const Settings = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header portfolioName="Settings" onRefresh={() => {}} />

      <div className="p-6">
        <Card title="Coming Soon" subtitle="Application settings">
          <p className="text-gray-600">
            This page will contain application settings, user preferences, and configuration options.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
