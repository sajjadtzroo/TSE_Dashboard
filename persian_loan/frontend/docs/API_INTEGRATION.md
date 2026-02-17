# Frontend API Integration Guide

**Iranian Banks Loan Dashboard -- React + TypeScript Frontend**

---

## Table of Contents

1. [Overview](#overview)
2. [API Client Setup](#api-client-setup)
3. [The ApiResponse Envelope](#the-apiresponse-envelope)
4. [TypeScript Types for API Responses](#typescript-types-for-api-responses)
5. [Service Layer Pattern](#service-layer-pattern)
6. [React Query Integration](#react-query-integration)
7. [Handling Pagination](#handling-pagination)
8. [Error Handling Patterns](#error-handling-patterns)
9. [Rate Limit Handling (429 Responses)](#rate-limit-handling-429-responses)
10. [Authentication Integration](#authentication-integration)
11. [Data Validation with Zod](#data-validation-with-zod)
12. [Best Practices](#best-practices)

---

## Overview

The frontend communicates with the FastAPI backend through a layered architecture:

```
React Components
      |
      v
  Custom Hooks (useBanks, useLoans, useAnalytics)
      |
      v
  React Query (caching, refetching, error handling)
      |
      v
  Service Layer (banksService, loansService, analyticsService)
      |
      v
  Axios Client (api.ts - base URL, interceptors, auth headers)
      |
      v
  FastAPI Backend (http://localhost:8000/api)
```

### Key Libraries

| Library            | Version | Purpose                        |
|--------------------|---------|--------------------------------|
| `axios`            | latest  | HTTP client                    |
| `@tanstack/react-query` | v5 | Server state management       |
| `zod`              | latest  | Runtime data validation        |

---

## API Client Setup

The base API client is configured in `src/services/api.ts`:

```typescript
import axios, { AxiosInstance, AxiosError } from "axios";

function getApiUrl(): string {
  // Development: use Vite proxy (empty string = same origin)
  if (import.meta.env.DEV) {
    return "";
  }

  // GitHub Codespaces: auto-detect and adjust port
  const hostname = window.location.hostname;
  if (hostname.includes(".app.github.dev") || hostname.includes(".github.dev")) {
    const currentPort = window.location.origin.match(/-(\d+)\./)?.[1] || "5173";
    return window.location.origin.replace(`-${currentPort}.`, "-8000.");
  }

  // Explicit environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Default
  return "http://localhost:8000";
}

export const api: AxiosInstance = axios.create({
  baseURL: `${getApiUrl()}/api`,
  headers: { "Content-Type": "application/json" },
  timeout: 60000, // 60 seconds
});
```

### Vite Proxy Configuration

In `vite.config.ts`, configure the proxy for development:

```typescript
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

### Environment Variables

| Variable         | Description                    | Example                      |
|------------------|--------------------------------|------------------------------|
| `VITE_API_URL`   | Backend API URL (production)   | `https://api.example.com`    |

Set in `.env.development`:

```
VITE_API_URL=http://localhost:8000
```

---

## The ApiResponse Envelope

The backend wraps all responses in a standardized `ApiResponse` envelope.

### Structure

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  meta: {
    timestamp: string;      // ISO 8601 UTC
    pagination?: {
      total: number;
      page: number;
      page_size: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    } | null;
    cached: boolean;
    cache_ttl?: number | null;
  };
  errors: Array<{
    code: string;
    message: string;
    field?: string | null;
    details?: Record<string, unknown> | null;
  }> | null;
}
```

### Success Example

```json
{
  "success": true,
  "data": [
    { "id": "melli", "nameFA": "بانک ملی", "loansCount": 5 }
  ],
  "meta": {
    "timestamp": "2026-02-05T10:00:00Z",
    "pagination": {
      "total": 25,
      "page": 1,
      "page_size": 20,
      "total_pages": 2,
      "has_next": true,
      "has_prev": false
    },
    "cached": false
  },
  "errors": null
}
```

### Error Example

```json
{
  "success": false,
  "data": null,
  "meta": { "timestamp": "2026-02-05T10:00:00Z" },
  "errors": [
    {
      "code": "BANK_NOT_FOUND",
      "message": "Bank with id 'xyz' not found"
    }
  ]
}
```

### Extracting Data

When consuming API responses, always check `success` first:

```typescript
const response = await api.get("/banks/");
const result = response.data; // This is the ApiResponse envelope

if (result.success) {
  const banks = result.data; // The actual bank data array
  const pagination = result.meta.pagination; // Pagination metadata
} else {
  const errors = result.errors; // Array of error details
  errors?.forEach((err) => {
    console.error(`[${err.code}] ${err.message}`);
  });
}
```

### Legacy Response Format

Some endpoints still use the legacy format:

```json
{
  "items": [ ... ],
  "total": 25
}
```

The service layer handles both formats transparently. See the current `banksService.getAll()` implementation which extracts `items` from the legacy format.

---

## TypeScript Types for API Responses

### Complete Type Definitions

Add these types to your project (e.g., `src/types/api.ts`):

```typescript
// =============================================================================
// API Response Envelope Types
// =============================================================================

/** Error detail from the backend */
export interface ApiErrorDetail {
  /** Machine-readable error code (e.g., "BANK_NOT_FOUND") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Field name for validation errors */
  field?: string | null;
  /** Additional error context */
  details?: Record<string, unknown> | null;
}

/** Pagination metadata */
export interface PaginationMeta {
  /** Total items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  page_size: number;
  /** Total number of pages */
  total_pages: number;
  /** Whether a next page exists */
  has_next: boolean;
  /** Whether a previous page exists */
  has_prev: boolean;
}

/** Response metadata */
export interface ResponseMeta {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Pagination info (list endpoints only) */
  pagination?: PaginationMeta | null;
  /** Whether served from cache */
  cached: boolean;
  /** Cache TTL in seconds */
  cache_ttl?: number | null;
}

/** Standard API response envelope */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data payload */
  data: T | null;
  /** Response metadata */
  meta: ResponseMeta;
  /** Error details (null for success) */
  errors: ApiErrorDetail[] | null;
}

/** Paginated API response (convenience type) */
export type PaginatedResponse<T> = ApiResponse<T[]>;

// =============================================================================
// Legacy Response Types (backward compatibility)
// =============================================================================

/** Legacy list response format */
export interface LegacyListResponse<T> {
  items: T[];
  total: number;
}

/** Legacy paginated response */
export interface LegacyPaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}
```

### Using with Existing Domain Types

```typescript
import type { Bank, LoanWithBank, SummaryStats } from "../types";
import type { ApiResponse, PaginatedResponse } from "../types/api";

// Paginated bank list
type BankListResponse = PaginatedResponse<Bank>;

// Single resource
type BankDetailResponse = ApiResponse<Bank>;

// Analytics summary
type SummaryResponse = ApiResponse<SummaryStats>;
```

---

## Service Layer Pattern

Each API module has a dedicated service file that handles data fetching and transformation.

### Banks Service (`src/services/banks.service.ts`)

```typescript
import api from "./api";
import type { Bank, LoanType } from "../types";

export const banksService = {
  /** Get all banks with pagination */
  getAll: async (page = 1, pageSize = 100): Promise<Bank[]> => {
    const response = await api.get("/banks/", {
      params: { page, page_size: pageSize },
    });
    // Handle both ApiResponse and legacy format
    const data = response.data;
    if (data.success !== undefined) {
      return data.data as Bank[];
    }
    return data.items as Bank[];
  },

  /** Get a single bank by ID */
  getById: async (id: string): Promise<Bank> => {
    const response = await api.get(`/banks/${id}`);
    return response.data;
  },

  /** Get loans for a specific bank */
  getLoans: async (id: string): Promise<LoanType[]> => {
    const response = await api.get(`/banks/${id}/loans`);
    return response.data.loans || [];
  },
};
```

### Loans Service (`src/services/loans.service.ts`)

```typescript
import api from "./api";
import type { LoanWithBank } from "../types";

export interface LoanFilters {
  no_guarantor?: boolean;
  calculation_method?: string;
  page?: number;
  page_size?: number;
}

export const loansService = {
  /** Get all loans with optional filters */
  getAll: async (params?: LoanFilters): Promise<LoanWithBank[]> => {
    const response = await api.get("/loans/", { params });
    const data = response.data;
    if (data.success !== undefined) {
      return data.data as LoanWithBank[];
    }
    return data.items as LoanWithBank[];
  },

  /** Get loans without guarantor requirement */
  getNoGuarantor: async (): Promise<LoanWithBank[]> => {
    const response = await api.get("/loans/no-guarantor/");
    return response.data.items as LoanWithBank[];
  },

  /** Compare multiple loans */
  compare: async (loanIds: string[]): Promise<any> => {
    const response = await api.get("/loans/compare/", {
      params: { loan_ids: loanIds.join(",") },
    });
    return response.data;
  },
};
```

### Analytics Service (`src/services/analytics.service.ts`)

```typescript
import api from "./api";
import type { SummaryStats } from "../types";

export const analyticsService = {
  /** Get summary statistics */
  getSummary: async (): Promise<SummaryStats> => {
    const response = await api.get("/analytics/summary/");
    // Handle ApiResponse envelope
    const data = response.data;
    return data.success !== undefined ? data.data : data;
  },

  /** Get banks grouped by category */
  getByCategory: async () => {
    const response = await api.get("/analytics/by-category/");
    return response.data;
  },
};
```

---

## React Query Integration

### Setup

In `src/main.tsx` or a provider component:

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes (matches Tier 1 cache)
      gcTime: 10 * 60 * 1000,      // 10 minutes garbage collection
      retry: 2,                      // Retry failed requests twice
      refetchOnWindowFocus: false,   // Don't refetch on tab focus
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Custom Hooks

#### `useBanks` Hook

```typescript
import { useQuery } from "@tanstack/react-query";
import { banksService } from "../services";
import type { Bank } from "../types";

export const BANKS_QUERY_KEYS = {
  all: ["banks"] as const,
  traditional: ["banks", "traditional"] as const,
  digital: ["banks", "digital"] as const,
  detail: (id: string) => ["banks", id] as const,
  loans: (id: string) => ["banks", id, "loans"] as const,
};

export function useBanks() {
  return useQuery<Bank[]>({
    queryKey: BANKS_QUERY_KEYS.all,
    queryFn: banksService.getAll,
  });
}

export function useBank(id: string) {
  return useQuery<Bank>({
    queryKey: BANKS_QUERY_KEYS.detail(id),
    queryFn: () => banksService.getById(id),
    enabled: !!id, // Don't fetch if no ID
  });
}

export function useBankLoans(id: string) {
  return useQuery({
    queryKey: BANKS_QUERY_KEYS.loans(id),
    queryFn: () => banksService.getLoans(id),
    enabled: !!id,
  });
}
```

#### `useLoans` Hook

```typescript
import { useQuery } from "@tanstack/react-query";
import { loansService, LoanFilters } from "../services/loans.service";
import type { LoanWithBank } from "../types";

export const LOANS_QUERY_KEYS = {
  all: ["loans"] as const,
  filtered: (filters: LoanFilters) => ["loans", filters] as const,
  noGuarantor: ["loans", "no-guarantor"] as const,
  byMethod: (method: string) => ["loans", "by-method", method] as const,
};

export function useLoans(filters?: LoanFilters) {
  return useQuery<LoanWithBank[]>({
    queryKey: filters ? LOANS_QUERY_KEYS.filtered(filters) : LOANS_QUERY_KEYS.all,
    queryFn: () => loansService.getAll(filters),
  });
}

export function useNoGuarantorLoans() {
  return useQuery<LoanWithBank[]>({
    queryKey: LOANS_QUERY_KEYS.noGuarantor,
    queryFn: loansService.getNoGuarantor,
  });
}
```

#### `useAnalytics` Hook

```typescript
import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "../services";
import type { SummaryStats } from "../types";

export const ANALYTICS_QUERY_KEYS = {
  summary: ["analytics", "summary"] as const,
  byCategory: ["analytics", "by-category"] as const,
  interestRates: ["analytics", "interest-rates"] as const,
  loanAmounts: ["analytics", "loan-amounts"] as const,
  requirements: ["analytics", "requirements-matrix"] as const,
};

export function useAnalyticsSummary() {
  return useQuery<SummaryStats>({
    queryKey: ANALYTICS_QUERY_KEYS.summary,
    queryFn: analyticsService.getSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes (matches Tier 1 cache TTL)
  });
}
```

### Using Hooks in Components

```tsx
import { useBanks } from "../hooks/useBanks";
import { Loading, Empty } from "../components/ui";

function BanksList() {
  const { data: banks, isLoading, error } = useBanks();

  if (isLoading) return <Loading />;
  if (error) return <div>Error loading banks: {error.message}</div>;
  if (!banks?.length) return <Empty message="No banks found" />;

  return (
    <div>
      {banks.map((bank) => (
        <BankCard key={bank.id} bank={bank} />
      ))}
    </div>
  );
}
```

---

## Handling Pagination

### Paginated Hook Example

```typescript
import { useQuery, keepPreviousData } from "@tanstack/react-query";

interface PaginationParams {
  page: number;
  pageSize: number;
}

export function usePaginatedBanks({ page, pageSize }: PaginationParams) {
  return useQuery({
    queryKey: ["banks", "paginated", page, pageSize],
    queryFn: async () => {
      const response = await api.get("/banks/", {
        params: { page, page_size: pageSize },
      });
      return response.data; // Returns ApiResponse with pagination metadata
    },
    placeholderData: keepPreviousData, // Keep previous data while loading next page
  });
}
```

### Pagination Component

```tsx
import { useState } from "react";

function PaginatedBanksList() {
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isFetching } = usePaginatedBanks({ page, pageSize });

  const pagination = data?.meta?.pagination;

  return (
    <div>
      {/* Loading indicator */}
      {isLoading && <Loading />}

      {/* Bank list */}
      {data?.data?.map((bank: Bank) => (
        <BankCard key={bank.id} bank={bank} />
      ))}

      {/* Pagination controls */}
      {pagination && (
        <div className="flex items-center gap-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.has_prev || isFetching}
          >
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.total_pages}
            ({pagination.total} total)
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.has_next || isFetching}
          >
            Next
          </button>
        </div>
      )}

      {/* Fetching indicator (when navigating pages) */}
      {isFetching && !isLoading && <span>Updating...</span>}
    </div>
  );
}
```

### Pagination Query Parameters

| Parameter   | Type     | Default | Range   | Backend Query Param |
|-------------|----------|---------|---------|---------------------|
| `page`      | `number` | `1`     | >= 1    | `page`              |
| `pageSize`  | `number` | `20`    | 1--100  | `page_size`         |

### Response Pagination Object

| Field         | Type      | Description                            |
|---------------|-----------|----------------------------------------|
| `total`       | `number`  | Total items across all pages           |
| `page`        | `number`  | Current page (1-indexed)               |
| `page_size`   | `number`  | Items per page                         |
| `total_pages` | `number`  | Total pages available                  |
| `has_next`    | `boolean` | Whether next page exists               |
| `has_prev`    | `boolean` | Whether previous page exists           |

---

## Error Handling Patterns

### Global Error Handler (Axios Interceptor)

```typescript
// src/services/api.ts
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Log all errors
    console.error("API Error:", error.response?.status, error.message);

    // Handle specific status codes
    if (error.response?.status === 401) {
      // Token expired or invalid
      // Trigger token refresh or redirect to login
    }

    if (error.response?.status === 429) {
      // Rate limited - show user-friendly message
      const retryAfter = error.response.headers["x-ratelimit-reset"];
      console.warn(`Rate limited. Retry after ${retryAfter}s`);
    }

    return Promise.reject(error);
  }
);
```

### React Query Error Handling

```tsx
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

function BankDetail({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery<Bank, AxiosError>({
    queryKey: ["banks", id],
    queryFn: () => banksService.getById(id),
    retry: (failureCount, error) => {
      // Don't retry 404s or 403s
      if (error.response?.status === 404 || error.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  if (isLoading) return <Loading />;

  if (error) {
    if (error.response?.status === 404) {
      return <Empty message="Bank not found" />;
    }
    return <div>Error: {error.message}</div>;
  }

  return <BankCard bank={data!} />;
}
```

### Extracting Error Details from ApiResponse

```typescript
function extractApiErrors(error: AxiosError): string[] {
  const responseData = error.response?.data as any;

  // New ApiResponse format
  if (responseData?.errors) {
    return responseData.errors.map(
      (err: { code: string; message: string }) => `[${err.code}] ${err.message}`
    );
  }

  // Legacy format
  if (responseData?.message) {
    return [responseData.message];
  }

  // FastAPI validation errors
  if (responseData?.detail) {
    if (Array.isArray(responseData.detail)) {
      return responseData.detail.map(
        (d: { msg: string; loc: string[] }) => `${d.loc.join(".")}: ${d.msg}`
      );
    }
    return [String(responseData.detail)];
  }

  return [error.message || "An unexpected error occurred"];
}
```

### Toast Notifications for Errors

```typescript
import { toast } from "../utils/toast";

function handleApiError(error: AxiosError) {
  const messages = extractApiErrors(error);
  messages.forEach((msg) => toast.error(msg));
}
```

---

## Rate Limit Handling (429 Responses)

### Detection

When the backend rate limit is exceeded, you receive:

```
HTTP 429 Too Many Requests

Headers:
  X-RateLimit-Limit: 200
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 45
```

### Automatic Retry with Backoff

```typescript
// src/services/api.ts
import axios, { AxiosError } from "axios";

const MAX_RETRIES = 3;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as any;

    if (error.response?.status === 429 && (!config._retryCount || config._retryCount < MAX_RETRIES)) {
      config._retryCount = (config._retryCount || 0) + 1;

      // Get retry delay from header, or use exponential backoff
      const retryAfter = error.response.headers["x-ratelimit-reset"];
      const delay = retryAfter
        ? parseInt(retryAfter) * 1000
        : Math.pow(2, config._retryCount) * 1000;

      console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${config._retryCount})`);

      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  }
);
```

### User-Facing Rate Limit Message

```tsx
function ApiErrorBanner({ error }: { error: AxiosError | null }) {
  if (!error) return null;

  if (error.response?.status === 429) {
    const resetSeconds = error.response.headers["x-ratelimit-reset"] || "60";
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p className="text-yellow-700">
          Too many requests. Please wait {resetSeconds} seconds before trying again.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4">
      <p className="text-red-700">{error.message}</p>
    </div>
  );
}
```

### Rate Limit Awareness per Endpoint

| Endpoint Type    | Limit          | Frontend Implication                      |
|------------------|----------------|-------------------------------------------|
| Auth (login)     | 5 req/min      | Debounce login form, disable button       |
| Read (GET)       | 200 req/min    | Unlikely to hit; safe for polling         |
| Write (POST)     | 20 req/min     | Debounce form submissions                 |

---

## Authentication Integration

### Token Storage and Management

```typescript
// src/services/auth.ts

const TOKEN_KEYS = {
  access: "ploan_access_token",
  refresh: "ploan_refresh_token",
};

export const authService = {
  /** Login and store tokens */
  login: async (username: string, password: string) => {
    const response = await api.post("/auth/login", { username, password });
    const tokens = response.data;

    localStorage.setItem(TOKEN_KEYS.access, tokens.access_token);
    localStorage.setItem(TOKEN_KEYS.refresh, tokens.refresh_token);

    return tokens;
  },

  /** Logout and clear tokens */
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Best-effort server-side logout
    } finally {
      localStorage.removeItem(TOKEN_KEYS.access);
      localStorage.removeItem(TOKEN_KEYS.refresh);
    }
  },

  /** Get stored access token */
  getAccessToken: () => localStorage.getItem(TOKEN_KEYS.access),

  /** Get stored refresh token */
  getRefreshToken: () => localStorage.getItem(TOKEN_KEYS.refresh),

  /** Get current user profile */
  getProfile: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
```

### Axios Interceptor for Auth Headers

```typescript
// Add auth token to every request
api.interceptors.request.use((config) => {
  const token = authService.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        // No refresh token - redirect to login
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newTokens = response.data;
        localStorage.setItem("ploan_access_token", newTokens.access_token);
        localStorage.setItem("ploan_refresh_token", newTokens.refresh_token);

        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return api(originalRequest);
      } catch {
        // Refresh failed - redirect to login
        localStorage.removeItem("ploan_access_token");
        localStorage.removeItem("ploan_refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Data Validation with Zod

The frontend uses Zod schemas to validate API responses at runtime, catching data shape issues early.

### Schema Definitions (`src/schemas/index.ts`)

```typescript
import { z } from "zod";

// Bank schema
export const bankSchema = z.object({
  id: z.string(),
  nameFA: z.string(),
  nameEN: z.string(),
  category: z.enum(["traditional-banks", "digital-banks"]),
  loansCount: z.number(),
  loanTypes: z.array(z.any()).optional(),
  // ... other fields
});

// Loan schema
export const loanWithBankSchema = z.object({
  bankId: z.string(),
  bankNameFA: z.string(),
  bankCategory: z.enum(["traditional-banks", "digital-banks"]),
  loanId: z.string().optional(),
  nameFA: z.string(),
  // ... other fields
});

// Generic list response schema
export function listResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number(),
  });
}

// Validate data with logging
export function validateData<T>(schema: z.ZodType<T>, data: unknown, context: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(`[${context}] Validation warning:`, result.error.issues);
    return data as T; // Return raw data on validation failure (graceful degradation)
  }
  return result.data;
}
```

### Usage in Services

```typescript
export const banksService = {
  getAll: async (): Promise<Bank[]> => {
    const response = await api.get("/banks/");
    const validated = validateData(
      listResponseSchema(bankSchema),
      response.data,
      "banks.getAll"
    );
    return validated.items as Bank[];
  },
};
```

---

## Best Practices

### 1. Always Use the Service Layer

Never call `api.get()` directly from components. Use the service layer so data transformation is centralized:

```typescript
// Good
const banks = await banksService.getAll();

// Avoid
const response = await api.get("/banks/");
const banks = response.data.items;
```

### 2. Use React Query for All API Calls

React Query provides caching, deduplication, background refetching, and error handling:

```typescript
// Good: React Query hook
const { data, isLoading, error } = useBanks();

// Avoid: Manual useEffect + useState
const [banks, setBanks] = useState([]);
useEffect(() => { fetchBanks().then(setBanks); }, []);
```

### 3. Match Frontend Cache Times to Backend

| Backend Cache Tier | TTL   | React Query `staleTime` |
|--------------------|-------|-------------------------|
| Tier 1             | 300s  | `5 * 60 * 1000`        |
| Tier 2             | 180s  | `3 * 60 * 1000`        |
| Tier 3             | 120s  | `2 * 60 * 1000`        |

### 4. Handle Loading and Error States

Every data-fetching component should handle three states:

```tsx
function DataComponent() {
  const { data, isLoading, error } = useQuery(...);

  if (isLoading) return <Loading />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data?.length) return <Empty />;

  return <DataDisplay data={data} />;
}
```

### 5. Use Query Key Conventions

Follow a consistent query key pattern:

```typescript
// Module-level keys
["banks"]                      // All banks
["banks", "traditional"]       // Filtered banks
["banks", bankId]              // Single bank
["banks", bankId, "loans"]     // Bank's loans

// With parameters
["loans", { no_guarantor: true, page: 1 }]
```

### 6. Prefetch Data for Navigation

```typescript
import { useQueryClient } from "@tanstack/react-query";

function BankCard({ bank }: { bank: Bank }) {
  const queryClient = useQueryClient();

  const prefetchBank = () => {
    queryClient.prefetchQuery({
      queryKey: BANKS_QUERY_KEYS.detail(bank.id),
      queryFn: () => banksService.getById(bank.id),
      staleTime: 3 * 60 * 1000,
    });
  };

  return (
    <Link
      to={`/banks/${bank.id}`}
      onMouseEnter={prefetchBank}
    >
      {bank.nameFA}
    </Link>
  );
}
```

### 7. Invalidate Queries After Mutations

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";

function CreateBankForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newBank: BankCreate) => banksService.create(newBank),
    onSuccess: () => {
      // Invalidate all bank-related queries
      queryClient.invalidateQueries({ queryKey: ["banks"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  // ...
}
```
