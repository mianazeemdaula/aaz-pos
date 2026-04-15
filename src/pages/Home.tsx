import { useNavigate } from 'react-router-dom';
import { ShoppingBag, BarChart3, Package, Users, Receipt, Shield, Zap, Globe, ArrowRight, Star, CheckCircle2 } from 'lucide-react';

const features = [
    { icon: ShoppingBag, title: 'Point of Sale', desc: 'Lightning-fast checkout with barcode scanning, split payments, and real-time inventory updates.' },
    { icon: Package, title: 'Inventory Management', desc: 'Track stock levels, variants, and movements. Get alerts for low stock and manage multiple warehouses.' },
    { icon: BarChart3, title: 'Reports & Analytics', desc: 'Comprehensive dashboards with sales trends, profit margins, top products, and customer insights.' },
    { icon: Users, title: 'Customer & Supplier', desc: 'Manage customer ledgers, credit limits, supplier payments, and maintain complete transaction history.' },
    { icon: Receipt, title: 'FBR Tax Compliance', desc: 'Built-in FBR fiscal integration with automated tax invoicing, QR codes, and GST schedules.' },
    { icon: Shield, title: 'Multi-User Roles', desc: 'Role-based access for admins, managers, cashiers, and workers with audit trails.' },
    { icon: Zap, title: 'Thermal Printing', desc: 'Print receipts, invoices, and reports on 58mm/80mm thermal printers with custom templates.' },
    { icon: Globe, title: 'Desktop & Web', desc: 'Run as a native desktop app via Tauri or deploy as a web application â€” your choice.' },
];

const highlights = [
    'Multi-variant products with barcode tracking',
    'Split payments across multiple accounts',
    'Advance bookings & held transactions',
    'Employee salary management & advances',
    'Recurring expenses automation',
    'Package/bundle deals support',
    'Promotions & discount engine',
    'Purchase returns & sale returns',
    'Customer & supplier ledger management',
    'Real-time dashboard with charts',
];

export function Home() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-950 via-gray-900 to-gray-950 text-white overflow-x-hidden">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/25">
                        <ShoppingBag size={20} className="text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">AAZ Point of Sale</span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/login')}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300">
                        Sign In
                    </button>
                    <button onClick={() => navigate('/login')}
                        className="px-5 py-2.5 text-sm font-medium rounded-xl bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300">
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 px-6 sm:px-12 pt-16 pb-20 max-w-7xl mx-auto">
                <div className="text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-8 animate-fade-in">
                        <Star size={12} className="fill-primary-400" />
                        Complete Business Management Solution
                    </div>
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-slide-up">
                        <span className="bg-linear-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
                            Modern POS for{' '}
                        </span>
                        <br />
                        <span className="bg-linear-to-r from-primary-400 via-primary-500 to-blue-500 bg-clip-text text-transparent">
                            Smart Businesses
                        </span>
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.15s' }}>
                        A complete point-of-sale system with inventory management, customer tracking, employee payroll, FBR tax compliance, and powerful analytics â€” all in one platform.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <button onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:scale-105">
                            Start Using Now
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </button>
                        <a href="#features"
                            className="px-8 py-3.5 text-base font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all duration-300">
                            Explore Features
                        </a>
                    </div>
                </div>

                {/* Stats bar */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up" style={{ animationDelay: '0.45s' }}>
                    {[
                        { label: 'Products & Variants', value: 'Unlimited' },
                        { label: 'Tax Schedules', value: '50+ GST' },
                        { label: 'Report Types', value: '10+' },
                        { label: 'User Roles', value: '5' },
                    ].map((s, i) => (
                        <div key={i} className="text-center p-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
                            <p className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">{s.value}</p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">A comprehensive suite of tools designed for retail, wholesale, and cold storage businesses.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {features.map((f, i) => (
                        <div key={i}
                            className="group p-6 rounded-2xl bg-white/3 border border-white/6 hover:bg-white/6 hover:border-white/12 transition-all duration-500 hover:-translate-y-1"
                            style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-500/20 to-primary-600/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <f.icon size={22} className="text-primary-400" />
                            </div>
                            <h3 className="text-base font-semibold mb-2 text-gray-100">{f.title}</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Highlights Section */}
            <section className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                            Built for{' '}
                            <span className="bg-linear-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent">
                                Pakistani Businesses
                            </span>
                        </h2>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Designed specifically for retail shops, cold stores, general stores, and wholesale businesses in Pakistan. Full FBR compliance, PKR currency, NTN/CNIC support, and Urdu-friendly.
                        </p>
                        <button onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg shadow-primary-500/25 transition-all duration-300">
                            Try It Now
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/3 border border-white/5">
                                <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                                <span className="text-sm text-gray-300">{h}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Demo Preview Section */}
            <section className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold mb-4">See It In Action</h2>
                    <p className="text-gray-400 max-w-xl mx-auto">Preview the dashboard and key workflows of the POS system.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { title: 'Dashboard', desc: 'Real-time sales analytics, profit tracking, and top product insights at a glance.', color: 'from-blue-500/20 to-blue-600/10' },
                        { title: 'Quick Sale', desc: 'Scan barcodes, apply discounts, split payments, and print thermal receipts instantly.', color: 'from-green-500/20 to-green-600/10' },
                        { title: 'Inventory', desc: 'Manage products with multiple variants, track stock movements, and set reorder alerts.', color: 'from-purple-500/20 to-purple-600/10' },
                    ].map((d, i) => (
                        <div key={i} className="relative rounded-2xl overflow-hidden border border-white/6 bg-white/2 group hover:border-white/12 transition-all duration-500">
                            <div className={`h-48 bg-linear-to-br ${d.color} flex items-center justify-center`}>
                                <div className="w-24 h-16 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                                    <BarChart3 size={28} className="text-white/40" />
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="text-base font-semibold mb-1.5">{d.title}</h3>
                                <p className="text-sm text-gray-500">{d.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto">
                <div className="relative rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-r from-primary-600/20 via-primary-500/10 to-blue-600/20 blur-xl" />
                    <div className="relative bg-white/3 border border-white/8 rounded-3xl p-12 sm:p-16 text-center backdrop-blur-sm">
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-gray-400 max-w-lg mx-auto mb-8">
                            Set up your complete POS system in minutes. No complex configuration needed.
                        </p>
                        <button onClick={() => navigate('/login')}
                            className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl bg-linear-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-xl shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 hover:scale-105">
                            Launch POS System
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 border-t border-white/6 px-6 sm:px-12 py-8 max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <ShoppingBag size={16} className="text-primary-500" />
                        AAZ Point of Sale
                    </div>
                    <p className="text-sm text-gray-600">
                        &copy; {new Date().getFullYear()} AAZ Solutions. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
