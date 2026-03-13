/**
 * Custom React Hook for API calls
 * Provides loading states, error handling, and data management
 */

import { useState, useEffect, useCallback } from 'react';
import type { ApiError } from '../types/api';

interface UseApiOptions<T> {
    initialData?: T;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
    autoFetch?: boolean;
}

interface UseApiReturn<T> {
    data: T | null;
    isLoading: boolean;
    error: ApiError | null;
    execute: (...args: any[]) => Promise<T | null>;
    reset: () => void;
}

/**
 * Generic hook for making API calls with state management
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, execute } = useApi(itemService.getItems);
 * 
 * useEffect(() => {
 *   execute();
 * }, []);
 * ```
 */
export function useApi<T>(
    apiFunction: (...args: any[]) => Promise<T>,
    options: UseApiOptions<T> = {}
): UseApiReturn<T> {
    const { initialData = null, onSuccess, onError, autoFetch = false } = options;

    const [data, setData] = useState<T | null>(initialData);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    const execute = useCallback(
        async (...args: any[]): Promise<T | null> => {
            setIsLoading(true);
            setError(null);

            try {
                const result = await apiFunction(...args);
                setData(result);

                if (onSuccess) {
                    onSuccess(result);
                }

                return result;
            } catch (err) {
                const apiError = err as ApiError;
                setError(apiError);

                if (onError) {
                    onError(apiError);
                }

                return null;
            } finally {
                setIsLoading(false);
            }
        },
        [apiFunction, onSuccess, onError]
    );

    const reset = useCallback(() => {
        setData(initialData);
        setIsLoading(false);
        setError(null);
    }, [initialData]);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            execute();
        }
    }, [autoFetch, execute]);

    return { data, isLoading, error, execute, reset };
}

/**
 * Hook for mutations (POST, PUT, DELETE operations)
 * Similar to useApi but without auto-fetch
 * 
 * @example
 * ```tsx
 * const { mutate, isLoading } = useMutation(itemService.createItem, {
 *   onSuccess: (data) => {
 *     toast.success('Item created successfully');
 *     navigate('/items');
 *   }
 * });
 * 
 * const handleSubmit = async (formData) => {
 *   await mutate(formData);
 * };
 * ```
 */
export function useMutation<T>(
    apiFunction: (...args: any[]) => Promise<T>,
    options: UseApiOptions<T> = {}
) {
    const { data, isLoading, error, execute, reset } = useApi(apiFunction, {
        ...options,
        autoFetch: false,
    });

    return {
        data,
        isLoading,
        error,
        mutate: execute,
        reset,
    };
}

/**
 * Hook for fetching data with automatic loading
 * 
 * @example
 * ```tsx
 * const { data: items, isLoading, error, refetch } = useQuery(
 *   () => itemService.getItems({ page: 1, limit: 10 })
 * );
 * ```
 */
export function useQuery<T>(
    apiFunction: () => Promise<T>,
    options: UseApiOptions<T> = {}
) {
    const { data, isLoading, error, execute, reset } = useApi(apiFunction, {
        ...options,
        autoFetch: true,
    });

    return {
        data,
        isLoading,
        error,
        refetch: execute,
        reset,
    };
}
