import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { apiClient } from '../services/api';
import { API_ENDPOINTS } from '../config/api';

const SESSION_KEY = 'pos_auth_session';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    // Start as true so ProtectedRoute waits while we restore session from storage
    const [isLoading, setIsLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (raw) {
                const session = JSON.parse(raw) as { user: User; token: string };
                if (session?.user && session?.token) {
                    setUser(session.user);
                    setToken(session.token);
                    apiClient.setAuthToken(session.token);
                }
            }
        } catch {
            localStorage.removeItem(SESSION_KEY);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        setIsLoading(true);
        try {
            const response = await apiClient.post<{ user: User; token: string }>(API_ENDPOINTS.auth.login, { username, password });
            if (response && response.user && response.token) {
                const loggedInUser: User = {
                    id: Number(response.user.id),
                    username: response.user.username,
                    name: response.user.name,
                    role: response.user.role as User['role'],
                };
                setUser(loggedInUser);
                apiClient.setAuthToken(response.token);
                setToken(response.token);
                localStorage.setItem(SESSION_KEY, JSON.stringify({ user: loggedInUser, token: response.token }));
                setIsLoading(false);
                return true;
            }
            setIsLoading(false);
            return false;
        } catch {
            setIsLoading(false);
            return false;
        }
    };

    const logout = () => {
        apiClient.clearAuthToken();
        setUser(null);
        setToken(null);
        localStorage.removeItem(SESSION_KEY);
    };

    const value: AuthContextType = {
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
