import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Loader2, X, ArrowLeft } from 'lucide-react';
import { useJobs } from '../context/JobsContext';
import { useFilters } from '../context/FiltersContext';
import { useDebounce } from '../hooks/useDebounce';
import { scrapeGroup } from '../api';
import JobFilters from '../components/jobs/JobFilters';
import JobCardList from '../components/jobs/JobCardList';
import JobDetailPanel from '../components/detail/JobDetailPanel';
import './DashboardPage.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { loadJobs, loadCategories, selectJobById, selectedJob, refreshJobs } = useJobs();
  const filters = useFilters();
  const { search, category, jobType, location, filter } = filters;

  const [showScrapeModal, setShowScrapeModal] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Load jobs when filters change
  useEffect(() => {
    loadJobs({
      search: debouncedSearch || undefined,
      category: category || undefined,
      jobType: jobType || undefined,
      location: location || undefined,
      filter,
    });
  }, [debouncedSearch, category, jobType, location, filter, loadJobs]);

  // Select job from URL params
  useEffect(() => {
    const jobId = searchParams.get('job');
    if (jobId) {
      selectJobById(jobId);
    }
  }, [searchParams, selectJobById]);

  // Update URL when job is selected
  useEffect(() => {
    if (selectedJob) {
      setSearchParams({ job: selectedJob._id });
    } else {
      setSearchParams({});
    }
  }, [selectedJob, setSearchParams]);

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return (
        ['www.facebook.com', 'facebook.com', 'm.facebook.com', 'web.facebook.com'].includes(
          parsed.hostname
        ) && parsed.pathname.includes('/groups/')
      );
    } catch {
      return false;
    }
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapeError(null);

    if (!scrapeUrl.trim()) {
      setScrapeError('Please enter a URL');
      return;
    }

    if (!validateUrl(scrapeUrl)) {
      setScrapeError('Please enter a valid Facebook group URL');
      return;
    }

    setIsScraping(true);

    try {
      await scrapeGroup({ url: scrapeUrl });
      setScrapeUrl('');
      setShowScrapeModal(false);
      // Refresh jobs list
      refreshJobs({
        search: debouncedSearch || undefined,
        category: category || undefined,
        jobType: jobType || undefined,
        location: location || undefined,
        filter,
      });
      loadCategories();
    } catch (err) {
      setScrapeError(err instanceof Error ? err.message : 'Failed to scrape group');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header__left">
            <button
              className="back-button"
              onClick={() => navigate('/')}
              title="Back to home"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="sidebar-title">Job Scraper</h1>
          </div>
          <button
            className="add-group-button"
            onClick={() => setShowScrapeModal(true)}
            title="Scrape new group"
          >
            <Plus size={20} />
          </button>
        </div>
        <JobFilters />
        <JobCardList />
      </aside>
      <main className="main-content">
        <JobDetailPanel />
      </main>

      {showScrapeModal && (
        <div className="modal-overlay" onClick={() => !isScraping && setShowScrapeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Scrape Facebook Group</h2>
              <button
                className="modal-close"
                onClick={() => !isScraping && setShowScrapeModal(false)}
                disabled={isScraping}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleScrape}>
              <label htmlFor="scrape-url">Facebook Group URL</label>
              <input
                id="scrape-url"
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://www.facebook.com/groups/..."
                disabled={isScraping}
              />
              {scrapeError && <p className="modal-error">{scrapeError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-cancel"
                  onClick={() => setShowScrapeModal(false)}
                  disabled={isScraping}
                >
                  Cancel
                </button>
                <button type="submit" className="modal-submit" disabled={isScraping}>
                  {isScraping ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      Scraping...
                    </>
                  ) : (
                    'Scrape Jobs'
                  )}
                </button>
              </div>
            </form>
            {isScraping && (
              <p className="modal-info">
                This may take a few minutes. Please wait...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
