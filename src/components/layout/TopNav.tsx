import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, ShoppingCart, ShoppingBag, Package, Users, Truck,
    UserCheck, Receipt, TrendingDown, Wallet, BarChart3, Settings as SettingsIcon,
    ChevronDown, LogOut, User, Tag, Bookmark, RefreshCw, Gift, Pause,
    Sliders, CalendarCheck, Printer, KeyRound, Menu, X, Sun, Moon, Monitor,
    Building2, ShieldCheck, Database,
} from 'lucide-react';

import { useAuth, useGlobalSettings, useTheme } from '../../contexts';
import type { PermissionModule } from '../../contexts';
import { REPORT_GROUPS, reportPath } from '../../config/reports';
import { AppLogo, APP_NAME } from '../ui/AppLogo';

type NavIcon = React.FC<{ size?: number; className?: string }>;
export type NavLeaf = { label: string; icon: NavIcon; path: string; perm?: PermissionModule };
/**
 * A top-level entry is a direct destination, a flat menu, or — where there are
 * enough destinations to need structure — a menu split into labelled sections.
 */
export type NavEntry =
    | { kind: 'link'; label: string; icon: NavIcon; path: string; perm?: PermissionModule }
    | { kind: 'menu'; label: string; icon: NavIcon; items: NavLeaf[] }
    | { kind: 'sections'; label: string; icon: NavIcon; perm?: PermissionModule; columns: number; sections: { heading: string; items: NavLeaf[] }[] };

/**
 * Twenty-five destinations folded into eight top-level entries, in the order an
 * operator moves through the day: sell, buy, stock, who you trade with, money,
 * then the things you read or configure.
 */
export const NAV: NavEntry[] = [
    { kind: 'link', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', perm: 'dashboard' },
    {
        kind: 'menu', label: 'Sell', icon: ShoppingCart, items: [
            { label: 'New Sale', icon: ShoppingCart, path: '/sale', perm: 'sales' },
            { label: 'Sales History', icon: Receipt, path: '/sale/returns', perm: 'sale-history' },
            { label: 'Advance Bookings', icon: CalendarCheck, path: '/advance-bookings', perm: 'advance-bookings' },
            { label: 'Held Transactions', icon: Pause, path: '/held', perm: 'held' },
            { label: 'Returns', icon: RefreshCw, path: '/returns', perm: 'returns' },
        ],
    },
    {
        kind: 'menu', label: 'Purchase', icon: ShoppingBag, items: [
            { label: 'New Purchase', icon: ShoppingBag, path: '/purchase', perm: 'purchases' },
            { label: 'Purchase History', icon: Receipt, path: '/purchase/returns', perm: 'purchase-history' },
        ],
    },
    {
        kind: 'menu', label: 'Inventory', icon: Package, items: [
            { label: 'Products', icon: Package, path: '/products', perm: 'products' },
            { label: 'Categories', icon: Tag, path: '/categories', perm: 'categories' },
            { label: 'Brands', icon: Bookmark, path: '/brands', perm: 'brands' },
            { label: 'Stock Adjustments', icon: Sliders, path: '/stock-adjustments', perm: 'stock-adjustments' },
            { label: 'Print Labels', icon: Printer, path: '/print-labels', perm: 'print-labels' },
        ],
    },
    {
        kind: 'menu', label: 'Parties', icon: Users, items: [
            { label: 'Customers', icon: Users, path: '/customers', perm: 'customers' },
            { label: 'Suppliers', icon: Truck, path: '/suppliers', perm: 'suppliers' },
        ],
    },
    {
        kind: 'menu', label: 'Finance', icon: Wallet, items: [
            { label: 'Payments', icon: Wallet, path: '/payments', perm: 'payments' },
            { label: 'Accounts', icon: Wallet, path: '/accounts', perm: 'accounts' },
            { label: 'Expenses', icon: TrendingDown, path: '/expenses', perm: 'expenses' },
            { label: 'Employees', icon: UserCheck, path: '/employees', perm: 'employees' },
            { label: 'Salary Slips', icon: Receipt, path: '/salary-slips', perm: 'salary-slips' },
            { label: 'Promotions', icon: Gift, path: '/promotions', perm: 'promotions' },
        ],
    },
    {
        kind: 'sections', label: 'Reports', icon: BarChart3, perm: 'reports', columns: 3,
        sections: [
            { heading: 'All reports', items: [{ label: 'Reports Index', icon: BarChart3, path: '/reports' }] },
            ...REPORT_GROUPS.map(group => ({
                heading: group.heading,
                items: group.reports.map(report => ({
                    label: report.navLabel ?? report.label,
                    icon: report.icon as NavIcon,
                    path: reportPath(report.id),
                })),
            })),
        ],
    },
    {
        kind: 'menu', label: 'Setup', icon: SettingsIcon, items: [
            { label: 'Business Profile', icon: Building2, path: '/settings/company', perm: 'settings' },
            { label: 'Thermal Printer', icon: Printer, path: '/settings/thermal' },
            { label: 'FBR Fiscal Gateway', icon: ShieldCheck, path: '/settings/fbr' },
            { label: 'Sales & Inventory Rules', icon: ShoppingCart, path: '/settings/sales', perm: 'settings' },
            { label: 'Database Backup', icon: Database, path: '/settings/database', perm: 'settings' },
            { label: 'User Permissions', icon: Users, path: '/settings/user-permissions', perm: 'settings' },
            { label: 'Users', icon: User, path: '/users', perm: 'users' },
        ],
    },
];

/** Paths whose children are separate destinations, so they must match exactly. */
const EXACT_PATHS = new Set(['/sale', '/purchase', '/reports']);

const isPathActive = (pathname: string, path: string) => {
    if (EXACT_PATHS.has(path)) return pathname === path;
    return pathname === path || pathname.startsWith(path + '/');
};

/** One destination inside a dropdown, flat or sectioned. */
function DropdownLink({ item, pathname }: { item: NavLeaf; pathname: string }) {
    const active = isPathActive(pathname, item.path);
    return (
        <Link
            to={item.path}
            className={`flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-[13px] transition-colors ${active
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750'}`}
        >
            <item.icon size={14} className={`shrink-0 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
            <span className="truncate">{item.label}</span>
        </Link>
    );
}

interface TopNavProps {
    onChangePassword: () => void;
}

export function TopNav({ onChangePassword }: TopNavProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { hasPermission } = useGlobalSettings();
    const { mode, resolved, cycle } = useTheme();

    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);

    // Hide entries the user cannot view, then drop any menu left empty.
    const allowed = (perm?: PermissionModule) => !perm || hasPermission(perm, 'view');

    const visible = NAV
        .map(entry => entry.kind === 'menu'
            ? { ...entry, items: entry.items.filter(item => allowed(item.perm)) }
            : entry)
        .filter(entry => {
            if (entry.kind === 'link') return allowed(entry.perm);
            if (entry.kind === 'sections') return allowed(entry.perm);
            return entry.items.length > 0;
        });

    const closeAll = useCallback(() => { setOpenMenu(null); setUserMenuOpen(false); }, []);

    // Dismiss open menus on outside click, on Escape, and whenever the route changes.
    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (barRef.current && !barRef.current.contains(event.target as Node)) closeAll();
        };
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeAll(); };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [closeAll]);

    useEffect(() => { closeAll(); setMobileOpen(false); }, [location.pathname, closeAll]);

    const handleLogout = () => { logout(); navigate('/login'); };

    const entryActive = (entry: NavEntry): boolean => {
        if (entry.kind === 'link') return isPathActive(location.pathname, entry.path);
        if (entry.kind === 'menu') return entry.items.some(item => isPathActive(location.pathname, item.path));
        return entry.sections.some(section => section.items.some(item => isPathActive(location.pathname, item.path)));
    };

    const ThemeIcon = mode === 'system' ? Monitor : resolved === 'dark' ? Moon : Sun;
    const themeTitle = mode === 'system'
        ? `Theme: follows system (${resolved})`
        : `Theme: ${mode}`;

    const itemBase =
        'flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap';

    // z-40 keeps the bar above page content but below modals (z-50+), so an open
    // dialog is never sliced by the navigation.
    return (
        <header ref={barRef} className="sticky top-0 z-40 bg-gray-900 text-gray-100 border-b border-gray-750">
            <div className="flex items-center gap-1 h-12 px-3">

                {/* Brand */}
                <Link to="/dashboard" className="flex items-center gap-2 pr-3 mr-1 shrink-0">
                    <AppLogo size={24} />
                    <span className="text-[13.5px] font-semibold tracking-tight hidden sm:block">{APP_NAME}</span>
                </Link>

                {/* Mobile menu trigger */}
                <button
                    onClick={() => setMobileOpen(open => !open)}
                    className="lg:hidden w-8 h-8 grid place-items-center rounded-md text-gray-300 hover:bg-gray-750"
                    aria-label="Menu"
                >
                    {mobileOpen ? <X size={17} /> : <Menu size={17} />}
                </button>

                {/* Menu bar */}
                <nav className="hidden lg:flex items-center gap-0.5 min-w-0">
                    {visible.map(entry => {
                        const active = entryActive(entry);

                        if (entry.kind === 'link') {
                            return (
                                <Link
                                    key={entry.path}
                                    to={entry.path}
                                    className={`${itemBase} ${active
                                        ? 'bg-gray-750 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                                >
                                    <entry.icon size={14} className={active ? 'text-primary-400' : 'text-gray-400'} />
                                    {entry.label}
                                </Link>
                            );
                        }

                        const open = openMenu === entry.label;

                        // Sectioned menu: a wide panel of labelled columns, for
                        // entries with more destinations than a single list can carry.
                        if (entry.kind === 'sections') {
                            return (
                                <div key={entry.label} className="relative">
                                    <button
                                        onClick={() => setOpenMenu(open ? null : entry.label)}
                                        aria-expanded={open}
                                        aria-haspopup="true"
                                        className={`${itemBase} ${open || active
                                            ? 'bg-gray-750 text-white'
                                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                                    >
                                        <entry.icon size={14} className={active ? 'text-primary-400' : 'text-gray-400'} />
                                        {entry.label}
                                        <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </button>

                                    {open && (
                                        <div
                                            className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl p-2 grid gap-x-4 gap-y-1"
                                            style={{ gridTemplateColumns: `repeat(${entry.columns}, minmax(190px, 1fr))` }}
                                        >
                                            {entry.sections.map(section => (
                                                <div key={section.heading} className="min-w-0">
                                                    <p className="px-2 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                                        {section.heading}
                                                    </p>
                                                    {section.items.map(item => (
                                                        <DropdownLink key={item.path} item={item} pathname={location.pathname} />
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return (
                            <div key={entry.label} className="relative">
                                <button
                                    onClick={() => setOpenMenu(open ? null : entry.label)}
                                    aria-expanded={open}
                                    aria-haspopup="true"
                                    className={`${itemBase} ${open || active
                                        ? 'bg-gray-750 text-white'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
                                >
                                    <entry.icon size={14} className={active ? 'text-primary-400' : 'text-gray-400'} />
                                    {entry.label}
                                    <ChevronDown size={11} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                                </button>

                                {open && (
                                    <div className="absolute left-0 top-full mt-1 min-w-[212px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl py-1">
                                        {entry.items.map(item => (
                                            <DropdownLink key={item.path} item={item} pathname={location.pathname} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                {/* Theme */}
                <button
                    onClick={cycle}
                    title={themeTitle}
                    aria-label={themeTitle}
                    className="w-8 h-8 grid place-items-center rounded-md text-gray-300 hover:bg-gray-750 hover:text-white transition-colors"
                >
                    <ThemeIcon size={15} />
                </button>

                {/* User */}
                <div className="relative ml-1 pl-2 border-l border-gray-750">
                    <button
                        onClick={() => { setUserMenuOpen(open => !open); setOpenMenu(null); }}
                        aria-expanded={userMenuOpen}
                        className="flex items-center gap-2 h-8 pl-1 pr-2 rounded-md hover:bg-gray-750 transition-colors"
                    >
                        <div className="w-6.5 h-6.5 rounded-full bg-primary-600 text-white grid place-items-center text-[11px] font-bold">
                            {user?.username?.[0]?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="hidden md:block text-left leading-tight">
                            <p className="text-[12.5px] font-medium text-gray-100 truncate max-w-[120px]">{user?.username}</p>
                            <p className="text-[10px] text-gray-400 capitalize">{user?.role?.toLowerCase()}</p>
                        </div>
                        <ChevronDown size={11} className="text-gray-400" />
                    </button>

                    {userMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-xl py-1">
                            <div className="px-3 py-2 border-b border-gray-150 dark:border-gray-700">
                                <p className="text-[13px] font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.username}</p>
                                <p className="text-[11px] text-gray-500 capitalize">{user?.role?.toLowerCase()}</p>
                            </div>
                            <button
                                onClick={() => { setUserMenuOpen(false); onChangePassword(); }}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
                            >
                                <KeyRound size={14} className="text-gray-400" /> Change Password
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile: the same groups, stacked */}
            {mobileOpen && (
                <div className="lg:hidden max-h-[70vh] overflow-y-auto border-t border-gray-750 px-2 py-2">
                    {visible.map(entry => {
                        if (entry.kind === 'link') {
                            return (
                                <Link
                                    key={entry.path}
                                    to={entry.path}
                                    className={`${itemBase} w-full ${entryActive(entry) ? 'bg-gray-750 text-white' : 'text-gray-300'}`}
                                >
                                    <entry.icon size={14} className="text-gray-400" /> {entry.label}
                                </Link>
                            );
                        }

                        // Flat and sectioned menus both flatten to headed lists here;
                        // a sectioned one keeps its sub-headings as a second level.
                        const groups = entry.kind === 'menu'
                            ? [{ heading: entry.label, items: entry.items }]
                            : entry.sections.map(section => ({
                                heading: `${entry.label} · ${section.heading}`,
                                items: section.items,
                            }));

                        return (
                            <div key={entry.label} className="mb-1.5">
                                {groups.map(group => (
                                    <div key={group.heading}>
                                        <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                            {group.heading}
                                        </p>
                                        {group.items.map(item => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`${itemBase} w-full ${isPathActive(location.pathname, item.path)
                                                    ? 'bg-gray-750 text-white' : 'text-gray-300'}`}
                                            >
                                                <item.icon size={14} className="text-gray-400" /> {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </header>
    );
}
