/**
 * API Response Types
 * Standard response formats for all API calls
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize?: number;
        limit?: number;
        total: number;
        totalPages: number;
        hasNextPage?: boolean;
        hasPreviousPage?: boolean;
    };
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
}

// HTTP Methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request Config
export interface RequestConfig {
    headers?: Record<string, string>;
    params?: Record<string, any>;
    timeout?: number;
    signal?: AbortSignal;
}

// Auth Tokens
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

// Login Request/Response
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    user: {
        id: string;
        username: string;
        name: string;
        role: string;
        avatar?: string;
    };
    token: string;
}
