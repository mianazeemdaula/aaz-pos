import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Users, Truck,
  UserCheck, Receipt, TrendingDown, Wallet, BarChart3, Settings,
  Menu, X, ChevronDown, LogOut, User, Tag, Bookmark,
  Layers, RefreshCw, Gift, Pause, Sliders, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts';

type MenuItem = { label: string; icon: React.FC<{ size?: number; className?: string }>; path: string };
type MenuGroup = { heading: string; items: MenuItem[] };

const MENU: MenuGroup[] = [
  {
    heading: 'Sales',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'New Sale', icon: ShoppingCart, path: '/sale' },
      { label: 'Sale & Returns', icon: RefreshCw, path: '/sale/returns' },
      { label: 'Held', icon: Pause, path: '/held' },
    ],
  },
  {
    heading: 'Purchases',
    items: [
      { label: 'New Purchase', icon: ShoppingBag, path: '/purchase' },
      { label: 'Purchase Returns', icon: RefreshCw, path: '/purchase/returns' },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Products', icon: Package, path: '/products' },
      { label: 'Categories', icon: Tag, path: '/categories' },
      { label: 'Brands', icon: Bookmark, path: '/brands' },
      { label: 'Stock Adjustments', icon: Sliders, path: '/stock-adjustments' },
    ],
  },
  {
    heading: 'Parties',
    items: [
      { label: 'Customers', icon: Users, path: '/customers' },
      { label: 'Customer Payments', icon: ArrowDownCircle, path: '/customer-payments' },
      { label: 'Suppliers', icon: Truck, path: '/suppliers' },
      { label: 'Supplier Payments', icon: ArrowUpCircle, path: '/supplier-payments' },
    ],
  },
  {
    heading: 'HR & Finance',
    items: [
      { label: 'Employees', icon: UserCheck, path: '/employees' },
      { label: 'Salary Slips', icon: Receipt, path: '/salary-slips' },
      { label: 'Expenses', icon: TrendingDown, path: '/expenses' },
      { label: 'Accounts', icon: Wallet, path: '/accounts' },
      { label: 'Promotions', icon: Gift, path: '/promotions' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { label: 'Reports', icon: BarChart3, path: '/reports' },
      { label: 'Users', icon: User, path: '/users' },
      { label: 'Settings', icon: Settings, path: '/settings' },
    ],
  },
];

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 transition-transform duration-200 flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">AAZ POS</p>
              <p className="text-xs text-gray-500">Point of Sale</p>
            </div>
          </div>
          <button className="lg:hidden text-gray-500" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {MENU.map(group => (
            <div key={group.heading} className="mb-3">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{group.heading}</p>
              {group.items.map(item => {
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${active ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'}`}>
                    <item.icon size={15} className={active ? 'text-primary-600' : ''} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 shrink-0 relative">
          <button onClick={() => setUserMenuOpen(p => !p)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate">{user?.username}</p>
              <p className="text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
            <ChevronDown size={12} />
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10">
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-400"><Menu size={20} /></button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">AAZ POS</span>
        </header>
        <main className="flex-1 p-4 lg:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
