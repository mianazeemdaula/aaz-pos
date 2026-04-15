import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/** Paths a CASHIER is allowed to visit */
const CASHIER_PATHS = ['/sale', '/sale/returns'];

export function ProtectedRoute() {
    const { user, isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        // Redirect to login, but save the location they were trying to access
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Cashiers can only access New Sale and Sales History
    if (user?.role === 'CASHIER' && !CASHIER_PATHS.includes(location.pathname)) {
        return <Navigate to="/sale" replace />;
    }

    return <Outlet />;
}
