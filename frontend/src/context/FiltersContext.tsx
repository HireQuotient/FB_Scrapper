import { createContext, useContext, useState, type ReactNode } from 'react';
import type { FilterType } from '../types/job';

interface FiltersState {
  search: string;
  category: string | null;
  jobType: string | null;
  location: string | null;
  filter: FilterType;
}

interface FiltersContextValue extends FiltersState {
  setSearch: (search: string) => void;
  setCategory: (category: string | null) => void;
  setJobType: (jobType: string | null) => void;
  setLocation: (location: string | null) => void;
  setFilter: (filter: FilterType) => void;
  clearAllFilters: () => void;
}

const FiltersContext = createContext<FiltersContextValue | undefined>(undefined);

const initialState: FiltersState = {
  search: '',
  category: null,
  jobType: null,
  location: null,
  filter: 'newest',
};

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FiltersState>(initialState);

  const setSearch = (search: string) => {
    setState((prev) => ({ ...prev, search }));
  };

  const setCategory = (category: string | null) => {
    setState((prev) => ({ ...prev, category }));
  };

  const setJobType = (jobType: string | null) => {
    setState((prev) => ({ ...prev, jobType }));
  };

  const setLocation = (location: string | null) => {
    setState((prev) => ({ ...prev, location }));
  };

  const setFilter = (filter: FilterType) => {
    setState((prev) => ({ ...prev, filter }));
  };

  const clearAllFilters = () => {
    setState(initialState);
  };

  return (
    <FiltersContext.Provider
      value={{
        ...state,
        setSearch,
        setCategory,
        setJobType,
        setLocation,
        setFilter,
        clearAllFilters,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
