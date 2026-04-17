import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, ShoppingBag, Package, Users, Truck,
  UserCheck, Receipt, TrendingDown, Wallet, BarChart3, Settings,
  Menu, X, ChevronDown, LogOut, User, Tag, Bookmark,
  Layers, RefreshCw, Gift, Pause, Sliders, CalendarCheck,
  PanelLeftClose, PanelLeftOpen, KeyRound, Eye, EyeOff, AlertCircle, Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts';
import { apiClient } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

type MenuItem = { label: string; icon: React.FC<{ size?: number; className?: string }>; path: string };
type MenuGroup = { heading: string; items: MenuItem[] };

/** Paths a CASHIER is allowed to visit */
const CASHIER_PATHS = new Set(['/sale', '/sale/returns']);

const MENU: MenuGroup[] = [
  {
    heading: 'Quick Actions',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
      { label: 'New Sale', icon: ShoppingCart, path: '/sale' },
      { label: 'New Purchase', icon: ShoppingBag, path: '/purchase' },
      { label: 'Advance Bookings', icon: CalendarCheck, path: '/advance-bookings' },
    ],
  },
  {
    heading: 'History',
    items: [
      { label: 'Held', icon: Pause, path: '/held' },
      { label: 'Sales', icon: ShoppingCart, path: '/sale/returns' },
      { label: 'Purchases', icon: ShoppingBag, path: '/purchase/returns' },
      { label: 'Returns', icon: RefreshCw, path: '/returns' },
      { label: 'Payments', icon: Wallet, path: '/payments' },
    ],
  },
  {
    heading: 'Inventory',
    items: [
      { label: 'Products', icon: Package, path: '/products' },
      { label: 'Categories', icon: Tag, path: '/categories' },
      { label: 'Brands', icon: Bookmark, path: '/brands' },
      { label: 'Stock', icon: Sliders, path: '/stock-adjustments' },
    ],
  },
  {
    heading: 'Parties',
    items: [
      { label: 'Customers', icon: Users, path: '/customers' },
      // { label: 'Customer Payments', icon: ArrowDownCircle, path: '/customer-payments' },
      { label: 'Suppliers', icon: Truck, path: '/suppliers' },
      // { label: 'Supplier Payments', icon: ArrowUpCircle, path: '/supplier-payments' },
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

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setShowCurrent(false); setShowNew(false); setError(''); setSuccess(false); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match'); return; }
    setLoading(true);
    try {
      await apiClient.post(API_ENDPOINTS.auth.changePassword, { currentPassword, newPassword });
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err: any) {
      setError(err?.error?.message || err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-primary-600" />
            <h3 className="font-semibold text-sm text-gray-900">Change Password</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        {success ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            <Check size={16} /> Password changed successfully
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                  className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                  className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input type={showNew ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={handleClose} className="flex-1 py-2 text-xs font-medium border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition">Cancel</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition disabled:opacity-50">
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pos_sidebar_collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('pos_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const isActive = (path: string) => {
    if (path === '/sale' || path === '/purchase') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isCashier = user?.role === 'CASHIER';
  const visibleMenu = isCashier
    ? MENU.map(g => ({ ...g, items: g.items.filter(i => CASHIER_PATHS.has(i.path)) })).filter(g => g.items.length > 0)
    : MENU;

  const sidebarW = collapsed ? 'w-16' : 'w-60';
  const mainML = collapsed ? 'lg:ml-16' : 'lg:ml-60';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — light mode */}
      <aside className={`fixed left-0 top-0 h-full ${sidebarW} bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-in-out flex flex-col shadow-sm ${sidebarOpen ? 'translate-x-0 w-60!' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <div className="w-8 h-8 bg-linear-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
              <Layers size={16} className="text-white" />
            </div>
            {(!collapsed || sidebarOpen) && (
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 tracking-wide truncate">AAZ POS</p>
                <p className="text-[10px] text-gray-400 font-medium">Point of Sale</p>
              </div>
            )}
          </div>
          <button className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors shrink-0" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
          <button className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shrink-0" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin scrollbar-thumb-gray-200">
          {visibleMenu.map(group => (
            <div key={group.heading} className="mb-3">
              {(!collapsed || sidebarOpen) && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{group.heading}</p>
              )}
              {collapsed && !sidebarOpen && <div className="h-px bg-gray-100 mx-2 my-2" />}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                      title={collapsed && !sidebarOpen ? item.label : undefined}
                      className={`group relative flex items-center ${collapsed && !sidebarOpen ? 'justify-center' : ''} gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-all duration-200 ${active
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}>
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-4 bg-primary-600 rounded-r-full" />}
                      <item.icon size={15} className={`shrink-0 transition-colors ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {(!collapsed || sidebarOpen) && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-gray-200 shrink-0 relative">
          <button onClick={() => setUserMenuOpen(p => !p)}
            className={`w-full flex items-center ${collapsed && !sidebarOpen ? 'justify-center' : ''} gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-100 text-sm transition-all duration-200`}>
            <div className="w-7 h-7 bg-linear-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            {(!collapsed || sidebarOpen) && (
              <>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-gray-800 truncate">{user?.username}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                </div>
                <ChevronDown size={12} className="text-gray-400 shrink-0" />
              </>
            )}
          </button>
          {userMenuOpen && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
              <button onClick={() => { setUserMenuOpen(false); setChangePasswordOpen(true); }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <KeyRound size={14} /> Change Password
              </button>
              <button onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 ${mainML} flex flex-col min-h-screen transition-all duration-200`}>
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 dark:text-gray-400"><Menu size={20} /></button>
          <span className="font-semibold text-gray-900 dark:text-gray-100">AAZ POS</span>
        </header>
        <main className="flex-1 p-4 lg:p-5">
          <Outlet />
        </main>
      </div>

      <ChangePasswordModal open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}
