import { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  ExternalLink,
  Heart,
  Share2,
  MessageCircle,
  Mail,
  Phone,
  User,
  MessageSquare,
  Image,
} from 'lucide-react';
import { useJobs } from '../../context/JobsContext';
import { formatTimeAgo } from '../../utils/formatters';
import { getCategoryColor, getCategoryName } from '../../utils/categoryColors';
import DetailsTab from './DetailsTab';
import AttachmentsTab from './AttachmentsTab';
import RawDataTab from './RawDataTab';
import CommentsPopup from './CommentsPopup';
import './JobDetailPanel.css';

type TabType = 'details' | 'attachments' | 'raw';

export default function JobDetailPanel() {
  const { selectedJob } = useJobs();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showComments, setShowComments] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  const hasAttachments = selectedJob?.attachments && selectedJob.attachments.length > 0;
  const hasComments = selectedJob?.topComments && selectedJob.topComments.length > 0;

  // Reset to details tab when job changes
  useEffect(() => {
    setActiveTab('details');
    setShowComments(false);
  }, [selectedJob?._id]);

  // Close comments popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (commentsRef.current && !commentsRef.current.contains(event.target as Node)) {
        setShowComments(false);
      }
    };

    if (showComments) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showComments]);

  if (!selectedJob) {
    return (
      <div className="detail-panel detail-panel--empty">
        <Briefcase size={64} className="empty-icon" />
        <p>Select a job to view details</p>
      </div>
    );
  }

  const timeAgo = formatTimeAgo(selectedJob.postTime || selectedJob.scrapedAt);
  const categoryColor = getCategoryColor(selectedJob.category);
  const hasContact = selectedJob.contactEmail || selectedJob.contactPhone || selectedJob.contactInfo || selectedJob.userName;

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div className="detail-header__main">
          <h1 className="detail-title">{selectedJob.jobTitle || 'Untitled Job'}</h1>
          <p className="detail-company">
            {selectedJob.company || selectedJob.userName || 'Unknown'}
          </p>

          <div className="detail-meta">
            {selectedJob.location && (
              <span className="meta-item">
                <MapPin size={16} />
                {selectedJob.location}
              </span>
            )}
            {selectedJob.salary && (
              <span className="meta-item">
                <DollarSign size={16} />
                {selectedJob.salary}
              </span>
            )}
            <span className="meta-item">
              <Clock size={16} />
              {timeAgo}
            </span>
          </div>

          <div className="detail-tags">
            <span
              className="category-tag"
              style={{
                backgroundColor: `${categoryColor}15`,
                color: categoryColor,
              }}
            >
              {getCategoryName(selectedJob.category)}
            </span>
            {selectedJob.jobType && <span className="type-tag">{selectedJob.jobType}</span>}
            {selectedJob.groupTitle && (
              <span className="group-tag">{selectedJob.groupTitle}</span>
            )}
          </div>

          <div className="detail-engagement">
            <span className="engagement-item">
              <Heart size={14} />
              {selectedJob.likesCount} likes
            </span>
            <span className="engagement-item">
              <Share2 size={14} />
              {selectedJob.sharesCount} shares
            </span>
            <div
              ref={commentsRef}
              className={`engagement-item engagement-item--clickable ${hasComments ? 'engagement-item--has-comments' : ''} ${showComments ? 'engagement-item--active' : ''}`}
              onClick={() => hasComments && setShowComments(!showComments)}
            >
              <MessageCircle size={14} />
              {selectedJob.commentsCount} comments
              {showComments && (
                <CommentsPopup
                  comments={selectedJob.topComments || []}
                  commentsCount={selectedJob.commentsCount}
                  facebookUrl={selectedJob.sourceUrl}
                />
              )}
            </div>
          </div>
        </div>

        {selectedJob.sourceUrl && (
          <a
            href={selectedJob.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="facebook-link"
          >
            <ExternalLink size={16} />
            View on Facebook
          </a>
        )}
      </div>

      <div className="detail-body">
        <div className="detail-main">
          <div className="detail-tabs">
            <button
              className={`tab-button ${activeTab === 'details' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            {hasAttachments && (
              <button
                className={`tab-button ${activeTab === 'attachments' ? 'tab-button--active' : ''}`}
                onClick={() => setActiveTab('attachments')}
              >
                <Image size={14} style={{ marginRight: '0.375rem' }} />
                Attachments ({selectedJob.attachments.length})
              </button>
            )}
            <button
              className={`tab-button ${activeTab === 'raw' ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab('raw')}
            >
              Raw Data
            </button>
          </div>

          <div className="detail-content">
            {activeTab === 'details' && <DetailsTab job={selectedJob} />}
            {activeTab === 'attachments' && <AttachmentsTab job={selectedJob} />}
            {activeTab === 'raw' && <RawDataTab job={selectedJob} />}
          </div>
        </div>

        <aside className="contact-sidebar">
          <h3 className="contact-sidebar__title">Contact Information</h3>

          {hasContact ? (
            <div className="contact-sidebar__list">
              {selectedJob.contactEmail && (
                <div className="contact-sidebar__item">
                  <Mail size={16} className="contact-sidebar__icon" />
                  <div className="contact-sidebar__content">
                    <span className="contact-sidebar__label">Email</span>
                    <a href={`mailto:${selectedJob.contactEmail}`} className="contact-sidebar__value contact-sidebar__link">
                      {selectedJob.contactEmail}
                    </a>
                  </div>
                </div>
              )}

              {selectedJob.contactPhone && (
                <div className="contact-sidebar__item">
                  <Phone size={16} className="contact-sidebar__icon" />
                  <div className="contact-sidebar__content">
                    <span className="contact-sidebar__label">Phone</span>
                    <a href={`tel:${selectedJob.contactPhone}`} className="contact-sidebar__value contact-sidebar__link">
                      {selectedJob.contactPhone}
                    </a>
                  </div>
                </div>
              )}

              {selectedJob.userName && (
                <div className="contact-sidebar__item">
                  <User size={16} className="contact-sidebar__icon" />
                  <div className="contact-sidebar__content">
                    <span className="contact-sidebar__label">Posted By</span>
                    <span className="contact-sidebar__value">{selectedJob.userName}</span>
                  </div>
                </div>
              )}

              {selectedJob.contactInfo && (
                <div className="contact-sidebar__item contact-sidebar__item--full">
                  <MessageSquare size={16} className="contact-sidebar__icon" />
                  <div className="contact-sidebar__content">
                    <span className="contact-sidebar__label">Additional Info</span>
                    <p className="contact-sidebar__value contact-sidebar__text">{selectedJob.contactInfo}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="contact-sidebar__empty">No contact information available</p>
          )}

          {selectedJob.sourceUrl && (
            <a
              href={selectedJob.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-sidebar__apply"
            >
              <ExternalLink size={18} />
              Apply on Facebook
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
