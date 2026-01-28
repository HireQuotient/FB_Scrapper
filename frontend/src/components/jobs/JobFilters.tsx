import { Search, X, Filter } from 'lucide-react';
import { useFilters } from '../../context/FiltersContext';
import { useJobs } from '../../context/JobsContext';
import type { FilterType } from '../../types/job';
import './JobFilters.css';

export default function JobFilters() {
  const { search, setSearch, category, setCategory, filter, setFilter } = useFilters();
  const { categories, pagination } = useJobs();

  return (
    <div className="job-filters">
      <div className="filters-header">
        <div className="filters-icon">
          <Filter size={18} />
        </div>
        <span className="filters-title">Filters</span>
        <span className="job-count">{pagination.totalCount} jobs</span>
      </div>

      <div className="search-container">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          placeholder="Search by role, location, keywords..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <button onClick={() => setSearch('')} className="clear-button">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="filter-row">
        <label>Category</label>
        <select
          value={category || 'all'}
          onChange={(e) => setCategory(e.target.value === 'all' ? null : e.target.value)}
          className="filter-select"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name} ({cat.count})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row">
        <label>Sort By</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterType)}
          className="filter-select"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="relevance">Most Relevant</option>
        </select>
      </div>
    </div>
  );
}
