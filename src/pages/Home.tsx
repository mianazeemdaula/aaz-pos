import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag,
    BarChart3,
    Package,
    Users,
    Shield,
    ArrowRight,
    Star,
    CheckCircle2,
    Menu,
    X,
    Layers,
    CreditCard,
    Calendar,
    QrCode,
    Settings,
    Percent,
    Tags,
    Truck,
    Store,
    Shirt,
    Smartphone,
    Plus,
    Sparkles,
    Gem,
    Cake,
    Wrench,
    BookOpen,
    Armchair,
    Cog
} from 'lucide-react';

const features = [
    { icon: ShoppingBag, title: 'Sales & Billing Management', desc: 'Lightning-fast billing, instant checkout, thermal printing, split payments, and hold/resume bills.' },
    { icon: Truck, title: 'Purchase & Supplier Management', desc: 'Track inventory supply records, manage purchase returns, invoices, and supplier history.' },
    { icon: Package, title: 'Smart Inventory & Stock Control', desc: 'Real-time stock tracking, variants management, low-stock alerts, and warehouse movements.' },
    { icon: Tags, title: 'Products, Categories & Brands Management', desc: 'Organize items systematically with dedicated category filters and brand tracking.' },
    { icon: Layers, title: 'Product Packages / Bundles', desc: 'Group items together into custom promotional packages, bundle deals, and combo offers.' },
    { icon: Users, title: 'Customer & Supplier Records (Ledgers)', desc: 'Complete transaction history logs, credit limits, account ledgers, and statement reports.' },
    { icon: CreditCard, title: 'Payment Tracking & Due Management', desc: 'Manage cash flow, split payment distributions, customer credit limits, and due recovery reminders.' },
    { icon: Calendar, title: 'Advance Booking System', desc: 'Schedule pre-orders, manage advance customer deposits, and book orders ahead of time.' },
    { icon: QrCode, title: 'QR Code / Barcode Printing (Products & Reports)', desc: 'Print barcode labels for products, generate QR codes on tax invoices, and export report barcodes.' },
    { icon: Users, title: 'Employee Management & Payroll System', desc: 'Manage employee profiles, record advance payments, and automate monthly salary slips.' },
    { icon: BarChart3, title: 'Advanced Reports & Business Analytics', desc: 'Analyze sales statistics, net profit margins, top-selling items, and customer activity patterns.' },
    { icon: Shield, title: 'Multi-User Access & Role Management', desc: 'Control permissions for admins, managers, cashiers, and workers with detailed activity audits.' },
    { icon: Settings, title: 'Complete Admin Panel & System Settings', desc: 'Configure system defaults, business receipts, invoice formats, tax settings, and system backup.' },
    { icon: Percent, title: 'Promotions, Discounts & Offers Management', desc: 'Run promotional discount campaigns, offer tier discounts, and create special coupon rules.' },
];

const businessTypes = [
    { name: 'General Stores & Marts', icon: Store },
    { name: 'Garments & Clothing Stores', icon: Shirt },
    { name: 'Electronics & Mobile Shops', icon: Smartphone },
    { name: 'Pharmacy & Medical Stores', icon: Plus },
    { name: 'Cosmetics & Beauty Shops', icon: Sparkles },
    { name: 'Shoe Stores', icon: ShoppingBag },
    { name: 'Jewelry Shops', icon: Gem },
    { name: 'Bakeries & Sweet Shops', icon: Cake },
    { name: 'Sanitary & Hardware Stores', icon: Wrench },
    { name: 'Book Shops & Stationery Stores', icon: BookOpen },
    { name: 'Furniture Shops', icon: Armchair },
    { name: 'Spare Parts Shops', icon: Cog },
];

export function Home() {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showWhatsApp, setShowWhatsApp] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 100) {
                setShowWhatsApp(true);
            } else {
                setShowWhatsApp(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-teal-50/30 text-slate-800 overflow-x-clip">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/3 -left-20 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
            </div>

            {/* Navigation Header */}
            <header className="sticky top-0 z-50 w-full bg-linear-to-r from-primary-700 to-primary-800 text-white shadow-md border-b border-primary-900/10">
                <nav className="flex items-center justify-between px-6 sm:px-12 py-4 max-w-7xl mx-auto">
                    <div className="flex items-center gap-3">

                        <span className="text-xl font-bold tracking-tight text-white">Aazify</span>
                    </div>

                    {/* Header Menu Links */}
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#" className="text-sm font-semibold text-white hover:text-white/80 transition-colors">Home</a>
                        <a href="#features" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">Pricing</a>
                        <a href="#testimonials" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">Testimonials</a>
                        <a href="#contact" className="text-sm font-semibold text-white/80 hover:text-white transition-colors">Contact</a>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={() => navigate('/login')}
                            className="px-5 py-2.5 text-sm font-medium rounded-xl text-white bg-white/10 hover:bg-white/20 border border-white/25 hover:border-white/35 transition-all duration-300">
                            Sign In
                        </button>
                        <button onClick={() => navigate('/login')}
                            className="px-5 py-2.5 text-sm font-medium rounded-xl text-primary-800 bg-white hover:bg-slate-100 shadow-md hover:shadow-lg transition-all duration-300">
                            Get Started
                        </button>
                    </div>

                    {/* Hamburger Button for Mobile */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 transition-all duration-300"
                        aria-label="Toggle menu"
                    >
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </nav>
            </header>

            {/* Mobile Navigation Drawer */}
            <div className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop overlay */}
                <div
                    onClick={() => setIsMenuOpen(false)}
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
                />

                {/* Drawer Container */}
                <div className={`absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-white text-slate-800 shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="space-y-8">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                    <ShoppingBag size={16} className="text-white" />
                                </div>
                                <span className="font-bold text-slate-900 text-base">AAZ POS</span>
                            </div>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Drawer Navigation Links */}
                        <nav className="flex flex-col gap-5">
                            <a
                                href="#"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-base font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                Home
                            </a>
                            <a
                                href="#features"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-base font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                Features
                            </a>
                            <a
                                href="#pricing"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-base font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                Pricing
                            </a>
                            <a
                                href="#testimonials"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-base font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                Testimonials
                            </a>
                            <a
                                href="#contact"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-base font-semibold text-slate-600 hover:text-primary-600 transition-colors"
                            >
                                Contact
                            </a>
                        </nav>
                    </div>

                    {/* Drawer Bottom Actions */}
                    <div className="border-t border-slate-100 pt-6 space-y-3">
                        <button
                            onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                            className="w-full py-3 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-center transition-all duration-200"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                            className="w-full py-3 text-sm font-semibold rounded-xl text-white bg-linear-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-center transition-all duration-200 shadow-md shadow-primary-600/10"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative z-10 px-6 sm:px-12 pt-16 pb-20 max-w-7xl mx-auto">
                <div className="text-center max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-700 text-xs font-medium mb-8 animate-fade-in">
                        <Star size={12} className="fill-primary-600 text-primary-600" />
                        Complete Business Management Solution
                    </div>
                    <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 animate-slide-up">
                        <span className="bg-linear-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                            Modern POS for{' '}
                        </span>
                        <br />
                        <span className="bg-linear-to-r from-primary-600 via-primary-500 to-blue-600 bg-clip-text text-transparent">
                            Smart Businesses
                        </span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.15s' }}>
                        A complete point-of-sale system with inventory management, customer tracking, employee payroll, FBR tax compliance, and powerful analytics — all in one platform.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                        <button onClick={() => navigate('/login')}
                            className="group flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-linear-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all duration-300 hover:scale-105">
                            Start Using Now
                            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                        </button>
                        <a href="#features"
                            className="px-8 py-3.5 text-base font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:scale-105">
                            Explore Features
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 px-6 sm:px-12 py-20 max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Everything You Need</h2>
                    <p className="text-slate-500 max-w-xl mx-auto">A comprehensive suite of tools designed for retail, wholesale, and cold storage businesses.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {features.map((f, i) => (
                        <div key={i}
                            className="group flex items-start gap-3.5 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/30 shadow-2xs hover:shadow-sm transition-all duration-300"
                            style={{ animationDelay: `${i * 0.05}s` }}>
                            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-50 to-primary-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <f.icon size={18} className="text-primary-600" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary-700 transition-colors duration-300 leading-tight">{f.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>


            {/* Business Types Section */}
            <section className="relative z-10 px-6 sm:px-12 py-20 max-w-7xl mx-auto border-t border-slate-200/60">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Perfect POS for All Types of Businesses</h2>
                    <p className="text-primary-700 max-w-xl mx-auto font-bold uppercase tracking-wider text-xs bg-primary-50 px-4 py-1.5 rounded-full inline-block">
                        Made for Every Shop & Business!
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
                    {businessTypes.map((b, i) => (
                        <div key={i} className="group p-5 rounded-2xl border border-slate-200/60 bg-white/70 shadow-2xs hover:shadow-md hover:bg-white hover:border-primary-500/35 transition-all duration-300 hover:-translate-y-1 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary-50 to-primary-100/50 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:from-primary-600 group-hover:to-primary-700 transition-all duration-300">
                                <b.icon size={20} className="text-primary-600 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">{b.name}</span>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-10">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100/80 border border-slate-200/50 rounded-full py-2.5 px-6 inline-block shadow-2xs">
                        And Much More...
                    </span>
                </div>
            </section>


            {/* Pricing Section */}
            <section id="pricing" className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto border-t border-slate-200/60">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-slate-500 max-w-xl mx-auto">Choose the perfect version for your business model. No hidden charges.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {[
                        {
                            name: 'Offline Version',
                            price: '35,000 PKR',
                            period: '/ per single branch',
                            renewal: 'Each year renewal: 10,000 PKR',
                            desc: 'Best for local shops and stores requiring an independent, internet-free solution.',
                            features: [
                                'Single Branch Deployment',
                                'Offline Local Database (No Internet Required)',
                                'Thermal Receipt & Invoice Printing',
                                'Standard Sales & Inventory Tracking',
                                'Customer & Supplier Ledgers',
                                'Lifetime Software Usage License'
                            ],
                            popular: false
                        },
                        {
                            name: 'Online Version',
                            price: '50,000 PKR',
                            period: '/ per year',
                            renewal: 'Each year renewal: 10,000 PKR',
                            desc: 'Perfect for businesses needing cloud connectivity, automated backups, and multi-device access.',
                            features: [
                                'Single Shop Cloud Access',
                                'Real-time Online Syncing',
                                'Multi-device Dashboard View',
                                'FBR Tax Compliance Integration',
                                'Automated Secure Cloud Backups',
                                'Priority Remote Technical Support'
                            ],
                            popular: true
                        },
                    ].map((p, i) => (
                        <div key={i} className={`relative rounded-3xl p-8 border ${p.popular ? 'border-primary-500 shadow-md ring-1 ring-primary-500/25 bg-white' : 'border-slate-200/80 bg-white/60 shadow-xs'} transition-all duration-300 hover:scale-102 flex flex-col justify-between`}>
                            <div>
                                {p.popular && (
                                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full tracking-wider uppercase">
                                        Recommended
                                    </span>
                                )}
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{p.name}</h3>
                                <p className="text-sm text-slate-500 mb-6">{p.desc}</p>
                                <div className="flex flex-col gap-1 mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{p.price}</span>
                                        <span className="text-slate-500 text-sm font-medium">{p.period}</span>
                                    </div>
                                    <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md self-start mt-1">{p.renewal}</span>
                                </div>
                                <button onClick={() => navigate('/login')}
                                    className={`w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-300 ${p.popular ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-600/10' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}>
                                    Get Started
                                </button>
                                <div className="mt-8 pt-8 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4">What's Included</p>
                                    <ul className="space-y-3">
                                        {p.features.map((feat, fi) => (
                                            <li key={fi} className="flex items-center gap-2.5">
                                                <CheckCircle2 size={16} className="text-primary-600 shrink-0" />
                                                <span className="text-sm text-slate-600">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto border-t border-slate-200/60">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Trusted by Store Owners</h2>
                    <p className="text-slate-500 max-w-xl mx-auto">See how businesses across Pakistan are streamlining their daily sales operations.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {[
                        { name: 'Muhammad Ali', role: 'General Store Owner (Lahore)', text: 'AAZ POS has simplified our sales. The FBR invoicing works seamlessly and barcode tracking is lightning-fast.', stars: 5 },
                        { name: 'Ayesha Khan', role: 'Boutique Manager (Karachi)', text: 'We love the customer ledger feature. Managing credit accounts and payments is no longer a headache for our staff.', stars: 5 },
                        { name: 'Zeeshan Ahmed', role: 'Cold Store Director (Multan)', text: 'The multi-warehouse inventory management is exactly what we needed. Highly reliable desktop application.', stars: 5 },
                    ].map((t, i) => (
                        <div key={i} className="p-8 rounded-2xl border border-slate-200/80 bg-white/70 shadow-xs hover:shadow-md transition-all duration-300">
                            <div className="flex gap-1 mb-4">
                                {[...Array(t.stars)].map((_, si) => (
                                    <Star key={si} size={16} className="fill-amber-400 text-amber-400" />
                                ))}
                            </div>
                            <p className="text-slate-600 text-sm italic mb-6">"{t.text}"</p>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                                <p className="text-xs text-slate-500">{t.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA / Contact Section */}
            <section id="contact" className="relative z-10 px-6 sm:px-12 py-24 max-w-7xl mx-auto">
                <div className="relative rounded-3xl overflow-hidden">
                    <div className="absolute inset-0 bg-linear-to-r from-primary-500/10 via-primary-50 to-blue-500/10 blur-xl" />
                    <div className="relative bg-white border border-slate-200/80 shadow-md rounded-3xl p-12 sm:p-16 text-center backdrop-blur-sm">
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Ready to Get Started?</h2>
                        <p className="text-slate-600 max-w-lg mx-auto mb-8">
                            Set up your complete POS system in minutes. Contact us today or try it for free.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={() => navigate('/login')}
                                className="group inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-linear-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-md shadow-primary-600/15 hover:shadow-lg transition-all duration-300 hover:scale-105">
                                Launch POS System
                                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </button>
                            <a href="mailto:contact@aazify.com"
                                className="px-8 py-3.5 text-base font-medium rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 transition-all duration-300 hover:scale-105">
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Simple Footer Section */}
            <footer className="relative z-10 border-t border-slate-200 bg-white/40 backdrop-blur-md px-6 sm:px-12 py-12 max-w-7xl mx-auto rounded-t-3xl mt-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">

                            <span className="text-base font-bold tracking-tight text-slate-900">Aazify Point of Sale</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            A complete and compliant retail, wholesale, and cold store point-of-sale system for businesses in Pakistan.
                        </p>

                        {/* Social Media clickable icons */}
                        <div className="space-y-2 pt-2">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Follow us & stay connected</p>
                            <div className="flex items-center gap-3.5 text-slate-400">
                                <a href="https://www.facebook.com/aazify" target="_blank" rel="noopener noreferrer" className="hover:text-[#1877F2] transition-colors duration-200" title="Facebook">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                    </svg>
                                </a>
                                <a href="https://www.instagram.com/aazify_" target="_blank" rel="noopener noreferrer" className="hover:text-[#E1306C] transition-colors duration-200" title="Instagram">
                                    <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                                    </svg>
                                </a>
                                <a href="https://www.youtube.com/@aazify.official" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF0000] transition-colors duration-200" title="YouTube">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.53 3.5 12 3.5 12 3.5s-7.53 0-9.388.555A3.003 3.003 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.47 20.5 12 20.5 12 20.5s7.53 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </a>
                                <a href="https://www.tiktok.com/@aazify" target="_blank" rel="noopener noreferrer" className="hover:text-[#000000] transition-colors duration-200" title="TikTok">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12.53.02C13.84.02 15.1.4 16.18 1.07A8.87 8.87 0 0 1 15.1 4.5c-.9-1.32-2.39-2.2-4.09-2.2a5.53 5.53 0 0 0-5.53 5.53 5.53 5.53 0 0 0 5.53 5.53c3.05 0 5.53-2.48 5.53-5.53V3.82c1.04.75 2.3 1.2 3.66 1.2h.01v2.88c-1.36 0-2.61-.45-3.66-1.2v6.63c0 4.63-3.75 8.38-8.38 8.38A8.38 8.38 0 0 1 3.75 13.5c0-4.63 3.75-8.38 8.38-8.38V.02h2.4z" />
                                    </svg>
                                </a>
                                <a href="https://www.pinterest.com/aazifycom/" target="_blank" rel="noopener noreferrer" className="hover:text-[#BD081C] transition-colors duration-200" title="Pinterest">
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M20.12 12c0 4.42-3.58 8-8 8-.66 0-1.29-.08-1.9-.22.25-.43.64-1.12.74-1.52.06-.23.36-1.4.36-1.4.2.39.8.72 1.44.72 1.9 0 3.28-1.74 3.28-3.9 0-1.89-1.61-3.66-4.14-3.66-2.93 0-4.64 2.1-4.64 4.38 0 1 .53 2.24 1.34 2.64.12.06.19.03.22-.09.02-.09.08-.34.11-.47.04-.15.02-.2-.09-.33-.36-.43-.59-1.24-.59-2.02 0-2.02 1.95-4.48 4.62-4.48 2.5 0 3.89 1.56 3.89 3.65 0 2.55-1.12 4.31-2.77 4.31-.86 0-1.51-.71-1.3-1.58.25-1.03.74-2.14.74-2.88 0-.66-.36-1.22-1.1-1.22-.87 0-1.56.9-1.56 2.1 0 .77.26 1.29.26 1.29s-.86 3.64-1.02 4.32c-.17.72-.08 1.6-.04 2.05A8.003 8.003 0 0 1 4 12c0-4.42 3.58-8 8-8s8 3.58 8 8z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Links</h4>
                        <ul className="space-y-2.5">
                            <li><a href="#" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Home</a></li>
                            <li><a href="#features" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Features</a></li>
                            <li><a href="#pricing" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Pricing</a></li>
                            <li><a href="#testimonials" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Testimonials</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Contact Info</h4>
                        <ul className="space-y-2.5">
                            <li><a href="https://www.aazify.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Website: www.aazify.com</a></li>
                            <li><a href="https://wa.me/923007395147" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">WhatsApp: 03007395147</a></li>
                            <li><a href="mailto:contact@aazify.com" className="text-xs text-slate-600 hover:text-primary-600 transition-colors">Email: contact@aazify.com</a></li>
                        </ul>
                    </div>

                </div>
                <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500">
                        &copy; {new Date().getFullYear()} AAZ Solutions. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        <a href="#" className="text-xs text-slate-500 hover:text-primary-600 transition-colors">Privacy Policy</a>
                        <a href="#" className="text-xs text-slate-500 hover:text-primary-600 transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>

            {/* Floating WhatsApp Button */}
            <a
                href="https://wa.me/923007395147"
                target="_blank"
                rel="noopener noreferrer"
                className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-[#25D366] text-white shadow-xl hover:bg-[#20ba5a] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center ${showWhatsApp ? 'translate-y-0 opacity-100' : 'translate-y-16 opacity-0 pointer-events-none'}`}
                aria-label="Contact on WhatsApp"
            >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.428 2.025 13.96 1 11.348 1 5.908 1 1.482 5.37 1.479 10.8c-.001 1.73.456 3.418 1.323 4.925L1.82 20.898l5.247-1.378c1.5.82 3.111 1.254 4.747 1.256-.002 0-.002 0 0 0zm11.348-7.854c-.26-.13-1.536-.759-1.774-.846-.237-.087-.41-.13-.58.13-.17.26-.66.846-.808 1.018-.149.172-.299.195-.56.065-.26-.13-1.1-.405-2.096-1.292-.775-.69-1.299-1.544-1.45-1.804-.15-.26-.016-.401.115-.53.118-.117.26-.303.39-.455.13-.152.173-.26.26-.433.087-.173.043-.325-.022-.455-.065-.13-.58-1.4-.795-1.92-.21-.51-.43-.44-.58-.448-.15-.008-.323-.008-.495-.008-.172 0-.452.065-.688.323-.236.258-.902.88-.902 2.148 0 1.268.923 2.496 1.05 2.67.127.172 1.817 2.775 4.402 3.89 1.08.463 1.9.742 2.549.948.748.238 1.43.204 1.97.124.6-.089 1.536-.628 1.752-1.236.216-.607.216-1.127.151-1.236-.065-.11-.237-.172-.497-.302z" />
                </svg>
            </a>
        </div>
    );
}

