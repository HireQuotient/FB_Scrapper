import { Mail, Phone, MessageSquare, User, ExternalLink } from 'lucide-react';
import type { Job } from '../../types/job';
import './ContactTab.css';

interface ContactTabProps {
  job: Job;
}

export default function ContactTab({ job }: ContactTabProps) {
  const hasContact = job.contactEmail || job.contactPhone || job.contactInfo || job.userName;

  if (!hasContact) {
    return (
      <div className="contact-tab">
        <p className="no-contact">No contact information available for this job.</p>
      </div>
    );
  }

  return (
    <div className="contact-tab">
      <div className="contact-list">
        {job.contactEmail && (
          <div className="contact-item">
            <div className="contact-icon">
              <Mail size={20} />
            </div>
            <div className="contact-content">
              <span className="contact-label">Email</span>
              <a href={`mailto:${job.contactEmail}`} className="contact-value contact-link">
                {job.contactEmail}
              </a>
            </div>
          </div>
        )}

        {job.contactPhone && (
          <div className="contact-item">
            <div className="contact-icon">
              <Phone size={20} />
            </div>
            <div className="contact-content">
              <span className="contact-label">Phone</span>
              <a href={`tel:${job.contactPhone}`} className="contact-value contact-link">
                {job.contactPhone}
              </a>
            </div>
          </div>
        )}

        {job.userName && (
          <div className="contact-item">
            <div className="contact-icon">
              <User size={20} />
            </div>
            <div className="contact-content">
              <span className="contact-label">Posted By</span>
              <span className="contact-value">{job.userName}</span>
            </div>
          </div>
        )}

        {job.contactInfo && (
          <div className="contact-item contact-item--full">
            <div className="contact-icon">
              <MessageSquare size={20} />
            </div>
            <div className="contact-content">
              <span className="contact-label">Contact Info</span>
              <p className="contact-value contact-info-text">{job.contactInfo}</p>
            </div>
          </div>
        )}
      </div>

      {job.sourceUrl && (
        <div className="contact-action">
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="apply-button"
          >
            <ExternalLink size={18} />
            Apply on Facebook
          </a>
          <p className="apply-hint">
            Click to view the original post and reach out to the poster directly.
          </p>
        </div>
      )}
    </div>
  );
}
