import type { Job, Category } from './job';

export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface AppliedFilters {
  filter: string;
  category: string | null;
  search: string | null;
  jobType: string | null;
  location: string | null;
}

export interface JobsResponse {
  jobs: Job[];
  pagination: Pagination;
  appliedFilters: AppliedFilters;
}

export interface CategoriesResponse {
  categories: Category[];
  totalCount: number;
}

export interface JobDetailResponse {
  job: Job;
}

export interface ScrapeResponse {
  jobs: Job[];
  totalSaved: number;
}

export interface ScrapeRequest {
  url: string;
}
