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

  constructor(baseURL: string) {
    this.baseURL = baseURL.replace(/\/$/, "");
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token || this.getStoredToken();
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

  protected setStoredToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  protected removeStoredToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
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

  logout(): void {
    this.token = null;
    this.removeStoredToken();
  }
}
