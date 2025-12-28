import { useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const NavMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/portfolio', label: 'Portfolio' },
    { path: '/simulator', label: 'Simulator' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className="relative lg:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900"
      >
        {isOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-200 shadow-lg z-50 rounded-lg">
          <nav className="p-2">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default NavMenu;
