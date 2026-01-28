import { FileText, Image, Type } from 'lucide-react';
import type { Job } from '../../types/job';
import './RawDataTab.css';

interface RawDataTabProps {
  job: Job;
}

export default function RawDataTab({ job }: RawDataTabProps) {
  return (
    <div className="raw-data-tab">
      {job.rawText && (
        <div className="raw-section">
          <h3 className="section-title">
            <FileText size={18} />
            Original Post Text
          </h3>
          <pre className="raw-text">{job.rawText}</pre>
        </div>
      )}

      {job.attachments && job.attachments.length > 0 && (
        <div className="raw-section">
          <h3 className="section-title">
            <Image size={18} />
            Attachments ({job.attachments.length})
          </h3>
          <div className="attachments-grid">
            {job.attachments.map((attachment, index) => (
              <div key={index} className="attachment-card">
                {attachment.photoUrl || attachment.thumbnail ? (
                  <img
                    src={attachment.photoUrl || attachment.thumbnail}
                    alt={`Attachment ${index + 1}`}
                    className="attachment-image"
                  />
                ) : (
                  <div className="attachment-placeholder">
                    <Image size={32} />
                    <span>{attachment.type || 'File'}</span>
                  </div>
                )}
                {attachment.ocrText && (
                  <div className="attachment-ocr">
                    <span className="ocr-label">OCR Text:</span>
                    <p className="ocr-text">{attachment.ocrText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {job.ocrTexts && job.ocrTexts.length > 0 && (
        <div className="raw-section">
          <h3 className="section-title">
            <Type size={18} />
            Extracted OCR Texts
          </h3>
          <div className="ocr-list">
            {job.ocrTexts.map((text, index) => (
              <div key={index} className="ocr-item">
                <span className="ocr-index">#{index + 1}</span>
                <p className="ocr-content">{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="raw-section">
        <h3 className="section-title">
          <FileText size={18} />
          Metadata
        </h3>
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="metadata-label">Facebook ID</span>
            <span className="metadata-value">{job.facebookId || 'N/A'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">User ID</span>
            <span className="metadata-value">{job.userId || 'N/A'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Group</span>
            <span className="metadata-value">{job.groupTitle || 'N/A'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Posted Date</span>
            <span className="metadata-value">{job.postedDate || job.postTime || 'N/A'}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Scraped At</span>
            <span className="metadata-value">
              {job.scrapedAt ? new Date(job.scrapedAt).toLocaleString() : 'N/A'}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Category</span>
            <span className="metadata-value">{job.category || 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
