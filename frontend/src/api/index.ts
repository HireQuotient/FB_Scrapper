import axios from 'axios';
import type { JobQueryParams } from '../types/job';
import type {
  JobsResponse,
  CategoriesResponse,
  JobDetailResponse,
  ScrapeResponse,
  ScrapeRequest,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function scrapeGroup(data: ScrapeRequest): Promise<ScrapeResponse> {
  const response = await api.post<ScrapeResponse>('/scrape', data);
  return response.data;
}

export async function fetchJobs(params: JobQueryParams): Promise<JobsResponse> {
  const response = await api.get<JobsResponse>('/jobs', { params });
  return response.data;
}

export async function fetchCategories(): Promise<CategoriesResponse> {
  const response = await api.get<CategoriesResponse>('/jobs/categories');
  return response.data;
}

export async function fetchJobById(id: string): Promise<JobDetailResponse> {
  const response = await api.get<JobDetailResponse>(`/jobs/${id}`);
  return response.data;
}

export default api;
