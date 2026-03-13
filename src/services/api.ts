/**
 * Base API Client
 * Handles all HTTP requests with interceptors, error handling, and token management
 */

import { API_CONFIG } from '../config/api';
import type { ApiError, HttpMethod, RequestConfig } from '../types/api';

class ApiClient {
    private baseURL: string;
    private timeout: number;
    private defaultHeaders: Record<string, string>;
    // In-memory token — cleared on page reload / app close
    private authToken: string | null = null;

    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.timeout = API_CONFIG.timeout;
        this.defaultHeaders = { ...API_CONFIG.headers };
    }

    /**
     * Allow runtime base URL override (from API settings page)
     */
    public setBaseURL(url: string): void {
        this.baseURL = url;
    }

    /** @deprecated kept for compatibility */
    public refreshConfig(): void {
        // no-op: config is now in-memory only
    }

    private getAuthToken(): string | null {
        return this.authToken;
    }

    public setAuthToken(token: string): void {
        this.authToken = token;
    }

    public clearAuthToken(): void {
        this.authToken = null;
    }

    /**
     * Build headers with auth token if available
     */
    private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
        const headers = { ...this.defaultHeaders, ...customHeaders };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Build full URL with query parameters
     */
    private buildURL(endpoint: string, params?: Record<string, any>): string {
        const url = new URL(`${this.baseURL}${endpoint}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        return url.toString();
    }

    /**
     * Make HTTP request
     */
    private async request<T>(
        method: HttpMethod,
        endpoint: string,
        data?: any,
        config?: RequestConfig
    ): Promise<T> {
        const url = this.buildURL(endpoint, config?.params);
        const headers = this.buildHeaders(config?.headers);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.timeout);

        try {
            const options: RequestInit = {
                method,
                headers,
                signal: config?.signal || controller.signal,
            };

            // Add body for POST, PUT, PATCH requests
            if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(url, options);

            clearTimeout(timeoutId);

            // Handle non-JSON responses
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const text = await response.text();
                return text as any;
            }

            const result = await response.json();

            // Handle HTTP errors
            if (!response.ok) {
                console.log('API Error Response:', { url, method, status: response.status, result });
                const error: ApiError = {
                    success: false,
                    error: {
                        code: result.error?.code || `HTTP_${response.status}`,
                        message: result.error?.message || result.error || response.statusText,
                        details: result.error?.details,
                    },
                    timestamp: result.timestamp || new Date().toISOString(),
                };
                throw error;
            }

            // Return successful response - return raw data
            return result;
        } catch (error) {
            clearTimeout(timeoutId);

            // Handle abort/timeout errors
            if (error instanceof Error && error.name === 'AbortError') {
                throw {
                    success: false,
                    error: {
                        code: 'TIMEOUT',
                        message: 'Request timeout',
                    },
                    timestamp: new Date().toISOString(),
                } as ApiError;
            }

            // Handle network errors
            if (error instanceof TypeError) {
                throw {
                    success: false,
                    error: {
                        code: 'NETWORK_ERROR',
                        message: 'Network error. Please check your connection.',
                    },
                    timestamp: new Date().toISOString(),
                } as ApiError;
            }

            // Re-throw API errors
            throw error;
        }
    }

    /**
     * GET request
     */
    async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('GET', endpoint, undefined, config);
    }

    /**
     * POST request
     */
    async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('POST', endpoint, data, config);
    }

    /**
     * PUT request
     */
    async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PUT', endpoint, data, config);
    }

    /**
     * PATCH request
     */
    async patch<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
        return this.request<T>('PATCH', endpoint, data, config);
    }

    /**
     * DELETE request
     */
    async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
        return this.request<T>('DELETE', endpoint, undefined, config);
    }

    /**
     * Fetch binary data (e.g., PDF) with authentication
     */
    async getBlob(endpoint: string, config?: RequestConfig): Promise<Blob> {
        const url = this.buildURL(endpoint, config?.params);
        const headers = this.buildHeaders(config?.headers);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config?.timeout || this.timeout);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers,
                signal: config?.signal || controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.blob();
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
