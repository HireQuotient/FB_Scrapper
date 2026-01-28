import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { scrapeGroup } from '../api';
import './LandingPage.css';

interface ScrapeProgress {
  url: string;
  status: 'pending' | 'scraping' | 'success' | 'error';
  error?: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CSV upload state
  const [csvUrls, setCsvUrls] = useState<string[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress[]>([]);
  const [isBulkScraping, setIsBulkScraping] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Please enter a valid Facebook group URL (e.g., https://www.facebook.com/groups/...)');
      return;
    }

    setIsLoading(true);

    try {
      await scrapeGroup({ url });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scrape group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim());

      // Extract URLs from CSV (handles both single column and multi-column CSVs)
      const urls: string[] = [];
      lines.forEach(line => {
        // Split by comma and check each cell for URLs
        const cells = line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
        cells.forEach(cell => {
          if (validateUrl(cell)) {
            urls.push(cell);
          }
        });
      });

      if (urls.length === 0) {
        setError('No valid Facebook group URLs found in the CSV file');
        return;
      }

      // Remove duplicates
      const uniqueUrls = [...new Set(urls)];
      setCsvUrls(uniqueUrls);
      setScrapeProgress(uniqueUrls.map(url => ({ url, status: 'pending' })));
      setError(null);
    };

    reader.onerror = () => {
      setError('Failed to read the CSV file');
    };

    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBulkScrape = async () => {
    if (csvUrls.length === 0) return;

    setIsBulkScraping(true);

    for (let i = 0; i < csvUrls.length; i++) {
      const currentUrl = csvUrls[i];

      // Update status to scraping
      setScrapeProgress(prev =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'scraping' } : item
        )
      );

      try {
        await scrapeGroup({ url: currentUrl });

        // Update status to success
        setScrapeProgress(prev =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'success' } : item
          )
        );
      } catch (err) {
        // Update status to error
        setScrapeProgress(prev =>
          prev.map((item, idx) =>
            idx === i ? {
              ...item,
              status: 'error',
              error: err instanceof Error ? err.message : 'Failed to scrape'
            } : item
          )
        );
      }
    }

    setIsBulkScraping(false);
  };

  const clearCsvUrls = () => {
    setCsvUrls([]);
    setScrapeProgress([]);
  };

  const removeUrl = (index: number) => {
    setCsvUrls(prev => prev.filter((_, i) => i !== index));
    setScrapeProgress(prev => prev.filter((_, i) => i !== index));
  };

  const completedCount = scrapeProgress.filter(p => p.status === 'success').length;
  const errorCount = scrapeProgress.filter(p => p.status === 'error').length;
  const allDone = scrapeProgress.length > 0 && scrapeProgress.every(p => p.status === 'success' || p.status === 'error');

  return (
    <div className="landing-page">
      <div className="landing-container">
        <div className="landing-header">
          <h1>Facebook Job Scraper</h1>
          <p>Scrape and organize job postings from Facebook groups</p>
        </div>

        <div className="landing-card">
          <form onSubmit={handleSubmit}>
            <label htmlFor="url">Facebook Group URL</label>
            <input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.facebook.com/groups/..."
              disabled={isLoading || isBulkScraping}
            />

            {error && <p className="error-message">{error}</p>}

            <button type="submit" disabled={isLoading || isBulkScraping} className="submit-button">
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  Scraping...
                </>
              ) : (
                'Scrape Jobs'
              )}
            </button>
          </form>

          {isLoading && (
            <div className="loading-info">
              <p>This may take a few minutes. We're fetching posts and extracting job data...</p>
            </div>
          )}

          <div className="divider">
            <span>or</span>
          </div>

          <div className="csv-upload">
            <label className="csv-upload__label">Bulk Import from CSV</label>
            <p className="csv-upload__hint">
              Upload a CSV file containing Facebook group URLs (one per line or in any column)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              disabled={isLoading || isBulkScraping}
              className="csv-upload__input"
              id="csv-file"
            />

            <label htmlFor="csv-file" className={`csv-upload__button ${(isLoading || isBulkScraping) ? 'csv-upload__button--disabled' : ''}`}>
              <Upload size={18} />
              Choose CSV File
            </label>
          </div>

          {csvUrls.length > 0 && (
            <div className="csv-preview">
              <div className="csv-preview__header">
                <span className="csv-preview__count">
                  {csvUrls.length} URL{csvUrls.length !== 1 ? 's' : ''} found
                  {completedCount > 0 && (
                    <span className="csv-preview__stats">
                      {' '}• {completedCount} done
                      {errorCount > 0 && `, ${errorCount} failed`}
                    </span>
                  )}
                </span>
                {!isBulkScraping && (
                  <button onClick={clearCsvUrls} className="csv-preview__clear">
                    Clear all
                  </button>
                )}
              </div>

              <ul className="csv-preview__list">
                {scrapeProgress.map((item, index) => (
                  <li key={index} className={`csv-preview__item csv-preview__item--${item.status}`}>
                    <span className="csv-preview__url" title={item.url}>
                      {item.url}
                    </span>
                    <div className="csv-preview__status">
                      {item.status === 'pending' && !isBulkScraping && (
                        <button
                          onClick={() => removeUrl(index)}
                          className="csv-preview__remove"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      )}
                      {item.status === 'scraping' && (
                        <Loader2 className="spinner" size={16} />
                      )}
                      {item.status === 'success' && (
                        <CheckCircle size={16} className="icon-success" />
                      )}
                      {item.status === 'error' && (
                        <span title={item.error}>
                          <AlertCircle size={16} className="icon-error" />
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="csv-preview__actions">
                {!allDone ? (
                  <button
                    onClick={handleBulkScrape}
                    disabled={isBulkScraping}
                    className="submit-button"
                  >
                    {isBulkScraping ? (
                      <>
                        <Loader2 className="spinner" size={20} />
                        Scraping {completedCount + errorCount + 1} of {csvUrls.length}...
                      </>
                    ) : (
                      `Scrape All ${csvUrls.length} Groups`
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="submit-button"
                  >
                    View Dashboard ({completedCount} jobs scraped)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="dashboard-link">
          Already scraped jobs?{' '}
          <a href="/dashboard" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
            View Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
