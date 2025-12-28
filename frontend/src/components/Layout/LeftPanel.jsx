const LeftPanel = ({ children }) => {
  return (
    <aside className="w-full lg:w-1/4 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-6 space-y-6">
        {children}
      </div>
    </aside>
  );
};

export default LeftPanel;
