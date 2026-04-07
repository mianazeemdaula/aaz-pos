import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, Component, type ReactNode, type ErrorInfo } from 'react';
import { MainLayout, ProtectedRoute } from './components/layout';
import { Login } from './pages/Login';
import "./App.css";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page error:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-6">
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Something went wrong on this page.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{(this.state.error as Error).message}</p>
          <button onClick={() => this.setState({ error: null })}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sale = lazy(() => import('./pages/Sale').then(m => ({ default: m.Sale })));
const SaleReturns = lazy(() => import('./pages/SaleReturns').then(m => ({ default: m.SaleReturns })));
const Purchase = lazy(() => import('./pages/Purchase').then(m => ({ default: m.Purchase })));
const PurchaseReturns = lazy(() => import('./pages/PurchaseReturns').then(m => ({ default: m.PurchaseReturns })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const ProductForm = lazy(() => import('./pages/ProductForm').then(m => ({ default: m.ProductForm })));
const Categories = lazy(() => import('./pages/Categories').then(m => ({ default: m.Categories })));
const Brands = lazy(() => import('./pages/Brands').then(m => ({ default: m.Brands })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail').then(m => ({ default: m.CustomerDetail })));
const CustomerPayments = lazy(() => import('./pages/CustomerPayments').then(m => ({ default: m.CustomerPayments })));
const Suppliers = lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const SupplierDetail = lazy(() => import('./pages/SupplierDetail').then(m => ({ default: m.SupplierDetail })));
const SupplierPayments = lazy(() => import('./pages/SupplierPayments').then(m => ({ default: m.SupplierPayments })));
const Employees = lazy(() => import('./pages/Employees').then(m => ({ default: m.Employees })));
const SalarySlips = lazy(() => import('./pages/SalarySlips').then(m => ({ default: m.SalarySlips })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const RecurringExpenses = lazy(() => import('./pages/RecurringExpenses').then(m => ({ default: m.RecurringExpenses })));
const Accounts = lazy(() => import('./pages/Accounts').then(m => ({ default: m.Accounts })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const HeldTransactions = lazy(() => import('./pages/HeldTransactions').then(m => ({ default: m.HeldTransactions })));
const Promotions = lazy(() => import('./pages/Promotions').then(m => ({ default: m.Promotions })));
const StockAdjustments = lazy(() => import('./pages/StockAdjustments').then(m => ({ default: m.StockAdjustments })));
const AdvanceBookings = lazy(() => import('./pages/AdvanceBookings').then(m => ({ default: m.AdvanceBookings })));

const Spinner = () => (
  <div className="flex items-center justify-center min-h-50">
    <div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route index element={<Navigate to="/login" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="sale" element={<ErrorBoundary><Sale /></ErrorBoundary>} />
              <Route path="sale/returns" element={<ErrorBoundary><SaleReturns /></ErrorBoundary>} />
              <Route path="purchase" element={<ErrorBoundary><Purchase /></ErrorBoundary>} />
              <Route path="purchase/returns" element={<ErrorBoundary><PurchaseReturns /></ErrorBoundary>} />
              <Route path="products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
              <Route path="products/new" element={<ErrorBoundary><ProductForm /></ErrorBoundary>} />
              <Route path="products/:id/edit" element={<ErrorBoundary><ProductForm /></ErrorBoundary>} />
              <Route path="categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
              <Route path="brands" element={<ErrorBoundary><Brands /></ErrorBoundary>} />
              <Route path="customers" element={<ErrorBoundary><Customers /></ErrorBoundary>} />
              <Route path="customers/:id" element={<ErrorBoundary><CustomerDetail /></ErrorBoundary>} />
              <Route path="customer-payments" element={<ErrorBoundary><CustomerPayments /></ErrorBoundary>} />
              <Route path="suppliers" element={<ErrorBoundary><Suppliers /></ErrorBoundary>} />
              <Route path="suppliers/:id" element={<ErrorBoundary><SupplierDetail /></ErrorBoundary>} />
              <Route path="supplier-payments" element={<ErrorBoundary><SupplierPayments /></ErrorBoundary>} />
              <Route path="employees" element={<ErrorBoundary><Employees /></ErrorBoundary>} />
              <Route path="salary-slips" element={<ErrorBoundary><SalarySlips /></ErrorBoundary>} />
              <Route path="expenses" element={<ErrorBoundary><Expenses /></ErrorBoundary>} />
              <Route path="recurring-expenses" element={<ErrorBoundary><RecurringExpenses /></ErrorBoundary>} />
              <Route path="accounts" element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
              <Route path="users" element={<ErrorBoundary><Users /></ErrorBoundary>} />
              <Route path="reports" element={<ErrorBoundary><Reports /></ErrorBoundary>} />
              <Route path="held" element={<ErrorBoundary><HeldTransactions /></ErrorBoundary>} />
              <Route path="promotions" element={<ErrorBoundary><Promotions /></ErrorBoundary>} />
              <Route path="stock-adjustments" element={<ErrorBoundary><StockAdjustments /></ErrorBoundary>} />
              <Route path="advance-bookings" element={<ErrorBoundary><AdvanceBookings /></ErrorBoundary>} />
              <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
              <Route path="admin" element={<ErrorBoundary><Admin /></ErrorBoundary>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
