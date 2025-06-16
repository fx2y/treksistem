export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

export interface RequestConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
}

export class BaseApiClient {
  protected baseURL: string;
  protected token: string | null = null;
  protected refreshToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, "");
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      this.setStoredToken(token);
    }
  }

  setRefreshToken(refreshToken: string | null): void {
    this.refreshToken = refreshToken;
    if (refreshToken) {
      this.setStoredRefreshToken(refreshToken);
    }
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.setToken(accessToken);
    this.setRefreshToken(refreshToken);
  }

  getToken(): string | null {
    return this.token || this.getStoredToken();
  }

  getRefreshToken(): string | null {
    return this.refreshToken || this.getStoredRefreshToken();
  }

  protected getStoredToken(): string | null {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("auth_token") ||
        sessionStorage.getItem("auth_token")
      );
    }
    return null;
  }

  protected getStoredRefreshToken(): string | null {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("refresh_token") ||
        sessionStorage.getItem("refresh_token")
      );
    }
    return null;
  }

  protected setStoredToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  protected setStoredRefreshToken(refreshToken: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("refresh_token", refreshToken);
    }
  }

  protected removeStoredToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      sessionStorage.removeItem("refresh_token");
    }
  }

  protected buildURL(path: string, params?: Record<string, string>): string {
    const url = new URL(path.startsWith("/") ? path : `/${path}`, this.baseURL);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  protected async request<T = any>(
    path: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { method = "GET", headers = {}, body, params } = config;

    const url = this.buildURL(path, params);
    const token = this.getToken();

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body && method !== "GET") {
      requestConfig.body =
        typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, requestConfig);

    if (response.status === 401 && this.getRefreshToken()) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        requestHeaders.Authorization = `Bearer ${this.getToken()}`;
        const retryConfig = { ...requestConfig, headers: requestHeaders };
        const retryResponse = await fetch(url, retryConfig);
        const retryData = await retryResponse.json();

        if (!retryResponse.ok) {
          const error = new Error(
            retryData.error || `HTTP ${retryResponse.status}`
          );
          (error as any).code = retryData.code;
          (error as any).details = retryData.details;
          throw error;
        }

        return retryData;
      }
    }

    const responseData = await response.json();

    if (!response.ok) {
      const error = new Error(responseData.error || `HTTP ${response.status}`);
      (error as any).code = responseData.code;
      (error as any).details = responseData.details;
      throw error;
    }

    return responseData;
  }

  async get<T = any>(
    path: string,
    params?: Record<string, string>
  ): Promise<T> {
    return this.request<T>(path, { method: "GET", params });
  }

  async post<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { method: "POST", body });
  }

  async put<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { method: "PUT", body });
  }

  async patch<T = any>(path: string, body?: any): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body });
  }

  async delete<T = any>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  protected async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-refresh-token": refreshToken,
        },
      });

      if (response.ok) {
        const data = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }

    this.logout();
    return false;
  }

  logout(): void {
    this.token = null;
    this.refreshToken = null;
    this.removeStoredToken();
  }
}
