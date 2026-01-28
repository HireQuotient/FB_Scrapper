import { useState } from 'react';
import { MessageCircle, ThumbsUp, User, ExternalLink, ChevronDown } from 'lucide-react';
import type { IComment } from '../../types/job';
import './CommentsPopup.css';

interface CommentsPopupProps {
  comments: IComment[];
  commentsCount: number;
  facebookUrl?: string;
}

const INITIAL_DISPLAY_COUNT = 3;

export default function CommentsPopup({ comments, commentsCount, facebookUrl }: CommentsPopupProps) {
  const [expanded, setExpanded] = useState(false);

  const hasMoreComments = comments.length < commentsCount;
  const displayedComments = expanded ? comments : comments.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreToShow = !expanded && comments.length > INITIAL_DISPLAY_COUNT;
  const allLocalCommentsShown = expanded || comments.length <= INITIAL_DISPLAY_COUNT;

  if (!comments || comments.length === 0) {
    return (
      <div className="comments-popup">
        <div className="comments-popup__header">
          <MessageCircle size={16} />
          <span>{commentsCount} Comments</span>
        </div>
        {facebookUrl ? (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="comments-popup__view-link"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={14} />
            View comments on Facebook
          </a>
        ) : (
          <p className="comments-popup__empty">No comments available to display</p>
        )}
      </div>
    );
  }

  return (
    <div className="comments-popup">
      <div className="comments-popup__header">
        <MessageCircle size={16} />
        <span>{commentsCount} Comments</span>
      </div>
      <div className="comments-popup__list">
        {displayedComments.map((comment, index) => (
          <div key={comment.id || index} className="comment-item">
            <div className="comment-item__avatar">
              {comment.authorProfilePicture ? (
                <img src={comment.authorProfilePicture} alt={comment.author} />
              ) : (
                <User size={16} />
              )}
            </div>
            <div className="comment-item__content">
              <span className="comment-item__author">{comment.author || 'Anonymous'}</span>
              <p className="comment-item__text">{comment.text}</p>
              <div className="comment-item__meta">
                {comment.date && <span className="comment-item__date">{comment.date}</span>}
                {comment.likesCount !== undefined && comment.likesCount > 0 && (
                  <span className="comment-item__likes">
                    <ThumbsUp size={12} />
                    {comment.likesCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show "Show more" button if there are more local comments to display */}
      {hasMoreToShow && (
        <button
          className="comments-popup__show-more"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          <ChevronDown size={14} />
          Show {comments.length - INITIAL_DISPLAY_COUNT} more comments
        </button>
      )}

      {/* Only show Facebook link after all local comments are shown */}
      {allLocalCommentsShown && hasMoreComments && facebookUrl && (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="comments-popup__more-link"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink size={14} />
          +{commentsCount - comments.length} more on Facebook
        </a>
      )}
    </div>
  );
}
