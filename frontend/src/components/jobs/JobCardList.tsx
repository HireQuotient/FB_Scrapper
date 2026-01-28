import { Loader2, Briefcase } from 'lucide-react';
import { useJobs } from '../../context/JobsContext';
import { useFilters } from '../../context/FiltersContext';
import JobCard from './JobCard';
import './JobCardList.css';

export default function JobCardList() {
  const { jobs, selectedJob, selectJob, isLoading, error, pagination, loadMoreJobs } = useJobs();
  const filters = useFilters();

  const handleLoadMore = () => {
    loadMoreJobs({
      search: filters.search || undefined,
      category: filters.category || undefined,
      jobType: filters.jobType || undefined,
      location: filters.location || undefined,
      filter: filters.filter,
    });
  };

  if (error) {
    return (
      <div className="job-list-message">
        <p className="error">{error}</p>
      </div>
    );
  }

  if (isLoading && jobs.length === 0) {
    return (
      <div className="job-list-message">
        <Loader2 className="spinner" size={32} />
        <p>Loading jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="job-list-message">
        <Briefcase size={48} className="empty-icon" />
        <p>No jobs found</p>
        <span className="hint">Try adjusting your filters or scrape a Facebook group</span>
      </div>
    );
  }

  return (
    <div className="job-card-list">
      {jobs.map((job) => (
        <JobCard
          key={job._id}
          job={job}
          isSelected={selectedJob?._id === job._id}
          onClick={() => selectJob(job)}
        />
      ))}

      {pagination.page < pagination.totalPages && (
        <div className="load-more">
          <button onClick={handleLoadMore} disabled={isLoading} className="load-more-button">
            {isLoading ? (
              <>
                <Loader2 className="spinner" size={16} />
                Loading...
              </>
            ) : (
              `Load More (${pagination.totalCount - jobs.length} remaining)`
            )}
          </button>
        </div>
      )}
    </div>
  );
}
