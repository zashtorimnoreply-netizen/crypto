import { NavLink } from 'react-router-dom';
import { FiHome, FiPieChart, FiSettings } from 'react-icons/fi';

const Sidebar = () => {
  const navItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/portfolio', icon: FiPieChart, label: 'Portfolio' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <nav className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h2 className="text-xl font-bold">Crypto Portfolio</h2>
      </div>
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;
