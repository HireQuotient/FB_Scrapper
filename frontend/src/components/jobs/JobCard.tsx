import { MapPin, DollarSign, Clock, Heart, Share2, MessageCircle } from 'lucide-react';
import type { Job } from '../../types/job';
import { formatTimeAgo, calculateEngagementScore } from '../../utils/formatters';
import { getCategoryColor, getCategoryName } from '../../utils/categoryColors';
import './JobCard.css';

interface JobCardProps {
  job: Job;
  isSelected: boolean;
  onClick: () => void;
}

export default function JobCard({ job, isSelected, onClick }: JobCardProps) {
  const score = calculateEngagementScore(
    job.likesCount,
    job.sharesCount,
    job.commentsCount
  );
  const timeAgo = formatTimeAgo(job.postTime || job.scrapedAt);
  const categoryColor = getCategoryColor(job.category);

  return (
    <div
      className={`job-card ${isSelected ? 'job-card--selected' : ''}`}
      onClick={onClick}
    >
      <div className="job-card__score">
        <span className="score-badge">{score}</span>
      </div>

      <div className="job-card__content">
        <h3 className="job-card__title">{job.jobTitle || 'Untitled Job'}</h3>
        <p className="job-card__company">{job.company || job.userName || 'Unknown'}</p>

        <div className="job-card__meta">
          {job.location && (
            <span className="meta-item">
              <MapPin size={14} />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="meta-item">
              <DollarSign size={14} />
              {job.salary}
            </span>
          )}
        </div>

        <div className="job-card__tags">
          <span
            className="category-tag"
            style={{
              backgroundColor: `${categoryColor}15`,
              color: categoryColor,
            }}
          >
            {getCategoryName(job.category)}
          </span>
          {job.jobType && (
            <span className="type-tag">{job.jobType}</span>
          )}
        </div>

        <div className="job-card__footer">
          <span className="time-ago">
            <Clock size={12} />
            {timeAgo}
          </span>
          <div className="engagement-stats">
            <span className="stat">
              <Heart size={12} />
              {job.likesCount}
            </span>
            <span className="stat">
              <Share2 size={12} />
              {job.sharesCount}
            </span>
            <span className="stat">
              <MessageCircle size={12} />
              {job.commentsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
