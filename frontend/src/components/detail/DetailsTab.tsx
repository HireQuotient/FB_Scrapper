import { DollarSign, Briefcase, FileText, CheckCircle } from 'lucide-react';
import type { Job } from '../../types/job';
import './DetailsTab.css';

interface DetailsTabProps {
  job: Job;
}

export default function DetailsTab({ job }: DetailsTabProps) {
  return (
    <div className="details-tab">
      <div className="details-grid">
        {job.salary && (
          <div className="detail-card">
            <div className="detail-card__icon">
              <DollarSign size={20} />
            </div>
            <div className="detail-card__content">
              <span className="detail-card__label">Salary / Pay</span>
              <span className="detail-card__value">{job.salary}</span>
            </div>
          </div>
        )}

        {job.jobType && (
          <div className="detail-card">
            <div className="detail-card__icon">
              <Briefcase size={20} />
            </div>
            <div className="detail-card__content">
              <span className="detail-card__label">Job Type</span>
              <span className="detail-card__value">{job.jobType}</span>
            </div>
          </div>
        )}
      </div>

      {job.requirements && job.requirements.length > 0 && (
        <div className="details-section">
          <h3 className="section-title">
            <CheckCircle size={18} />
            Requirements
          </h3>
          <ul className="requirements-list">
            {job.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {job.description && (
        <div className="details-section">
          <h3 className="section-title">
            <FileText size={18} />
            Description
          </h3>
          <p className="description-text">{job.description}</p>
        </div>
      )}

      {!job.salary && !job.jobType && !job.requirements?.length && !job.description && (
        <p className="no-details">No additional details available for this job.</p>
      )}
    </div>
  );
}
