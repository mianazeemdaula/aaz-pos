/**
 * API Status Context
 * Checks API connectivity on app startup and provides status throughout the app
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { API_CONFIG } from '../config/api';
import { useAuth } from './AuthContext';

export type ApiStatus = 'checking' | 'connected' | 'disconnected';

interface ApiStatusContextType {
    status: ApiStatus;
    lastChecked: Date | null;
    checkConnection: () => Promise<boolean>;
}

const ApiStatusContext = createContext<ApiStatusContextType | undefined>(undefined);

interface ApiStatusProviderProps {
    children: ReactNode;
}

export function ApiStatusProvider({ children }: ApiStatusProviderProps) {
    const { isAuthenticated } = useAuth();
    const [status, setStatus] = useState<ApiStatus>('checking');
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    // Check API connection only when authenticated
    useEffect(() => {
        if (isAuthenticated) {
            checkConnection();
        } else {
            setStatus('disconnected');
            setLastChecked(null);
        }
    }, [isAuthenticated]);

    const checkConnection = async (): Promise<boolean> => {
        setStatus('checking');

        try {
            // Get base URL from localStorage or config
            let baseURL = API_CONFIG.baseURL;
            const savedSettings = localStorage.getItem('api_settings');
            if (savedSettings) {
                try {
                    const parsed = JSON.parse(savedSettings);
                    if (parsed.baseURL) baseURL = parsed.baseURL;
                } catch (e) {
                    // Ignore parsing error
                }
            }

            // Try to make a simple API call (health check)
            const response = await fetch(`${baseURL}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });

            if (response.ok) {
                setStatus('connected');
                setLastChecked(new Date());
                return true;
            } else {
                setStatus('disconnected');
                setLastChecked(new Date());
                return false;
            }
        } catch (error) {
            console.warn('API connection check failed:', error);
            setStatus('disconnected');
            setLastChecked(new Date());
            return false;
        }
    };

    return (
        <ApiStatusContext.Provider
            value={{
                status,
                lastChecked,
                checkConnection,
            }}
        >
            {children}
        </ApiStatusContext.Provider>
    );
}

export function useApiStatus() {
    const context = useContext(ApiStatusContext);
    if (context === undefined) {
        throw new Error('useApiStatus must be used within an ApiStatusProvider');
    }
    return context;
}
