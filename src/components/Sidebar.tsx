import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutList, 
  ClipboardList, 
  TrendingUp, 
  Wallet, 
  History, 
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Item List', path: '/', icon: LayoutList },
    { name: 'Stock Opname', path: '/stock', icon: ClipboardList },
    { name: 'Laporan Keuntungan', path: '/profit', icon: TrendingUp },
    { name: 'Pengeluaran', path: '/expenses', icon: Wallet },
    { name: 'History Penjualan', path: '/history', icon: History },
    { name: 'Estimasi Penjualan', path: '/estimated', icon: BarChart3 },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 text-white flex items-center justify-between px-4 z-50">
        <span className="text-xl font-bold text-blue-400">TwinsA</span>
        <button onClick={toggleSidebar} className="p-2 hover:bg-gray-800 rounded-md">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar Content */}
      <div className={`
        fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 text-white h-screen flex flex-col z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 text-2xl font-bold border-b border-gray-800 hidden lg:block text-blue-400">
          TwinsA
        </div>
        
        {/* Mobile Header in Sidebar */}
        <div className="p-6 flex lg:hidden items-center justify-between border-b border-gray-800">
          <span className="text-xl font-bold text-blue-400">Menu</span>
          <button onClick={closeSidebar}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 mt-6 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center px-6 py-4 hover:bg-gray-800 transition-colors ${
                  isActive ? 'bg-blue-600' : ''
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
