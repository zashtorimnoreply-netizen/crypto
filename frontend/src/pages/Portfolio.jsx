import Card from '../components/UI/Card';

const Portfolio = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Portfolio Details</h1>
      <Card title="Coming Soon" subtitle="Detailed portfolio view">
        <p className="text-gray-600">
          This page will show detailed portfolio information, positions, trade history, and more.
        </p>
      </Card>
    </div>
  );
};

export default Portfolio;
