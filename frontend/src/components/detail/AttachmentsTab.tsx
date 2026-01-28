import { useState } from 'react';
import { Image, X, ZoomIn, FileText } from 'lucide-react';
import type { Job } from '../../types/job';
import './AttachmentsTab.css';

interface AttachmentsTabProps {
  job: Job;
}

export default function AttachmentsTab({ job }: AttachmentsTabProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showOcrIndex, setShowOcrIndex] = useState<number | null>(null);

  if (!job.attachments || job.attachments.length === 0) {
    return (
      <div className="attachments-tab attachments-tab--empty">
        <Image size={48} className="empty-icon" />
        <p>No attachments available</p>
      </div>
    );
  }

  return (
    <div className="attachments-tab">
      <div className="attachments-grid">
        {job.attachments.map((attachment, index) => (
          <div key={index} className="attachment-card">
            {attachment.photoUrl || attachment.thumbnail ? (
              <>
                <div className="attachment-image-container">
                  <img
                    src={attachment.photoUrl || attachment.thumbnail}
                    alt={`Attachment ${index + 1}`}
                    className="attachment-image"
                  />
                  <button
                    className="attachment-zoom"
                    onClick={() => setSelectedImage(attachment.photoUrl || attachment.thumbnail || null)}
                    title="View full size"
                  >
                    <ZoomIn size={18} />
                  </button>
                </div>
                <div className="attachment-info">
                  <span className="attachment-type">{attachment.type || 'Image'}</span>
                  {attachment.photoWidth && attachment.photoHeight && (
                    <span className="attachment-size">
                      {attachment.photoWidth} × {attachment.photoHeight}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="attachment-placeholder">
                <Image size={32} />
                <span>{attachment.type || 'File'}</span>
              </div>
            )}
            {attachment.ocrText && (
              <div className="attachment-ocr">
                <button
                  className="ocr-toggle-btn"
                  onClick={() => setShowOcrIndex(showOcrIndex === index ? null : index)}
                  title={showOcrIndex === index ? "Hide extracted text" : "Show extracted text"}
                >
                  <FileText size={14} />
                  <span>{showOcrIndex === index ? "Hide Text" : "Show Text"}</span>
                </button>
                {showOcrIndex === index && (
                  <p className="ocr-text">{attachment.ocrText}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="lightbox" onClick={() => setSelectedImage(null)}>
          <button className="lightbox-close" onClick={() => setSelectedImage(null)}>
            <X size={24} />
          </button>
          <img
            src={selectedImage}
            alt="Full size attachment"
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
