import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Package, 
  Users, 
  ShoppingCart, 
  ClipboardList, 
  FileText, 
  Send, 
  ChefHat as Chef, 
  Calendar, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  CreditCard,
  Building,
  BarChart3,
  DollarSign,
  Camera,
  User,
  Upload,
  Cog,
  Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AlertSystem from './AlertSystem';

const menuItems = [
  // Core Inventory & Operations
  { path: '/', icon: Home, label: 'Dashboard', roles: ['ADMIN', 'CHEF', 'STORE', 'COOK', 'VIEWER'] },
  { path: '/items', icon: Package, label: 'Items', roles: ['ADMIN', 'CHEF', 'STORE', 'COOK', 'VIEWER'] },
  { path: '/vendors', icon: Users, label: 'Vendors', roles: ['ADMIN', 'STORE'] },
  { path: '/purchase-orders', icon: ShoppingCart, label: 'Purchase Orders', roles: ['ADMIN', 'STORE'] },
  { path: '/grn', icon: FileText, label: 'GRN', roles: ['ADMIN', 'STORE'] },
  { path: '/indents', icon: ClipboardList, label: 'Indents', roles: ['ADMIN', 'CHEF', 'STORE', 'COOK'] },
  { path: '/issues', icon: Send, label: 'Indent Issues', roles: ['ADMIN', 'STORE'] },
  
  // Food & Menu Management
  { path: '/dishes', icon: Chef, label: 'Dishes', roles: ['ADMIN', 'CHEF', 'FNB_MANAGER'] },
  { path: '/meal-plans', icon: Calendar, label: 'Meal Plans', roles: ['ADMIN', 'CHEF', 'FNB_MANAGER'] },
  
  // FNB Manager Section
  { path: '/fnb-dashboard', icon: BarChart3, label: 'FNB Dashboard', roles: ['FNB_MANAGER'] },
  { path: '/mess-facilities', icon: Building, label: 'Mess Facilities', roles: ['FNB_MANAGER'] },
  { path: '/packages', icon: Package, label: 'Packages', roles: ['FNB_MANAGER'] },
  { path: '/subscriptions', icon: CreditCard, label: 'Subscriptions', roles: ['FNB_MANAGER'] },
  { path: '/student-orders', icon: ShoppingCart, label: 'Orders', roles: ['FNB_MANAGER'] },
  
  { path: '/student-photos', icon: User, label: 'Customers', roles: ['FNB_MANAGER', 'ADMIN'] },
  { path: '/csv-uploads', icon: Upload, label: 'CSV Uploads', roles: ['FNB_MANAGER','ADMIN'] },
  { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['FNB_MANAGER'] },
  { path: '/transaction-reports', icon: DollarSign, label: 'Transaction Reports', roles: ['FNB_MANAGER'] },

  // System Administration
  { path: '/users', icon: Users, label: 'Users', roles: ['ADMIN'] },
  { path: '/settings', icon: Settings, label: 'Settings', roles: ['ADMIN'] },
  { path: '/system-config', icon: Cog, label: 'System Config', roles: ['ADMIN'] },
  { path: '/admin-config', icon: Database, label: 'Admin Config', roles: ['ADMIN'] },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Group menu items by section
  const groupedMenuItems = {
    inventory: filteredMenuItems.filter(item => 
      ['/items', '/vendors', '/purchase-orders', '/grn', '/indents', '/issues'].includes(item.path)
    ),
  
    fnb: filteredMenuItems.filter(item => 
      ['/fnb-dashboard', '/mess-facilities', '/packages', '/subscriptions', '/student-orders','/qr-scanner','/csv-uploads','/student-photos'].includes(item.path)
    ),
      food: filteredMenuItems.filter(item => 
      ['/dishes', '/meal-plans'].includes(item.path)
    ),
     reports: filteredMenuItems.filter(item => 
      ['/reports', '/messreports', '/feedbackreports','/transaction-reports'].includes(item.path)
    ),
    system: filteredMenuItems.filter(item => 
      ['/users', '/settings','/system-config','/admin-config'].includes(item.path)
    ),
    dashboard: filteredMenuItems.filter(item => item.path === '/')
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        initial={false}
       
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-2">
            <img 
              src="https://www.asram.in/asramlogo.png" 
              alt="Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-lg font-bold text-gray-800">Food Service</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {/* Dashboard */}
          {groupedMenuItems.dashboard.length > 0 && (
            <div className="mb-6">
              <ul className="space-y-2">
                {groupedMenuItems.dashboard.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Inventory & Operations */}
          {groupedMenuItems.inventory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                Inventory & Operations
              </h3>
              <ul className="space-y-2">
                {groupedMenuItems.inventory.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
 {/* FNB Management */}
          {groupedMenuItems.fnb.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                FNB Management
              </h3>
              <ul className="space-y-2">
                {groupedMenuItems.fnb.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {/* Food Management */}
          {groupedMenuItems.food.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                Food Management
              </h3>
              <ul className="space-y-2">
                {groupedMenuItems.food.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

         

              {/* FNB Management */}
          {groupedMenuItems.reports.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                Reports
              </h3>
              <ul className="space-y-2">
                {groupedMenuItems.reports.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* System Administration */}
          {groupedMenuItems.system.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
                System
              </h3>
              <ul className="space-y-2">
                {groupedMenuItems.system.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  
                  return (
                    <li key={item.path}>
                      <motion.button
                        onClick={() => {
                          navigate(item.path);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Icon size={20} className="mr-3" />
                        <span className="font-medium">{item.label}</span>
                      </motion.button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} className="mr-3" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <AlertSystem />
              </div>
              
              <div className="hidden sm:block text-sm text-gray-600">
                Welcome back, {user?.name}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;