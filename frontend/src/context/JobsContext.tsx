import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Job, JobQueryParams, Category } from '../types/job';
import type { Pagination } from '../types/api';
import { fetchJobs, fetchCategories, fetchJobById } from '../api';

interface JobsState {
  jobs: Job[];
  selectedJob: Job | null;
  isLoading: boolean;
  error: string | null;
  pagination: Pagination;
  categories: Category[];
  categoriesLoading: boolean;
}

interface JobsContextValue extends JobsState {
  loadJobs: (params: JobQueryParams) => Promise<void>;
  loadMoreJobs: (params: JobQueryParams) => Promise<void>;
  selectJob: (job: Job | null) => void;
  selectJobById: (id: string) => Promise<void>;
  loadCategories: () => Promise<void>;
  refreshJobs: (params: JobQueryParams) => Promise<void>;
}

const JobsContext = createContext<JobsContextValue | undefined>(undefined);

const initialPagination: Pagination = {
  page: 1,
  limit: 20,
  totalCount: 0,
  totalPages: 0,
};

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>(initialPagination);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const loadJobs = useCallback(async (params: JobQueryParams) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchJobs({ ...params, page: 1 });
      setJobs(response.jobs);
      setPagination(response.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreJobs = useCallback(
    async (params: JobQueryParams) => {
      if (isLoading || pagination.page >= pagination.totalPages) return;

      setIsLoading(true);
      setError(null);
      try {
        const response = await fetchJobs({
          ...params,
          page: pagination.page + 1,
        });
        setJobs((prev) => [...prev, ...response.jobs]);
        setPagination(response.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load more jobs');
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, pagination]
  );

  const selectJob = useCallback((job: Job | null) => {
    setSelectedJob(job);
  }, []);

  const selectJobById = useCallback(async (id: string) => {
    const existingJob = jobs.find((j) => j._id === id);
    if (existingJob) {
      setSelectedJob(existingJob);
      return;
    }

    try {
      const response = await fetchJobById(id);
      setSelectedJob(response.job);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    }
  }, [jobs]);

  const loadCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await fetchCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  const refreshJobs = useCallback(async (params: JobQueryParams) => {
    await loadJobs(params);
  }, [loadJobs]);

  return (
    <JobsContext.Provider
      value={{
        jobs,
        selectedJob,
        isLoading,
        error,
        pagination,
        categories,
        categoriesLoading,
        loadJobs,
        loadMoreJobs,
        selectJob,
        selectJobById,
        loadCategories,
        refreshJobs,
      }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobsProvider');
  }
  return context;
}
