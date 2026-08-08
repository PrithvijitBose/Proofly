import { apiClient } from "./client";

export interface HealthResponse {
  status: string;
  project_name: string;
  version: string;
  timestamp: string;
  backend_url: string;
  frontend_url: string;
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  return apiClient<HealthResponse>("/api/v1/health");
}
