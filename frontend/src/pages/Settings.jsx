import Card from '../components/UI/Card';

const Settings = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>
      <Card title="Coming Soon" subtitle="Application settings">
        <p className="text-gray-600">
          This page will contain application settings, user preferences, and configuration options.
        </p>
      </Card>
    </div>
  );
};

export default Settings;
