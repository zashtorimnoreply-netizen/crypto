const RightPanel = ({ children }) => {
  return (
    <main className="flex-1 bg-white overflow-y-auto">
      <div className="p-6 space-y-6">
        {children}
      </div>
    </main>
  );
};

export default RightPanel;
