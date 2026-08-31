import React from 'react';
import './SkeletonCard.css';

/**
 * SkeletonCard Component
 * Provides clean warm-beige pulsing skeleton loader cards matching the clinical theme palette.
 */
export const SkeletonCard = ({ count = 2, title = "Analyzing Data..." }) => {
  return (
    <div className="skeleton-container">
      <div className="skeleton-status-header">
        <div className="skeleton-pulse skeleton-badge"></div>
        <span className="skeleton-status-title">{title}</span>
      </div>

      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="skeleton-card">
          <div className="skeleton-card-header">
            <div className="skeleton-pulse skeleton-title-bar"></div>
            <div className="skeleton-pulse skeleton-pill-bar"></div>
          </div>
          <div className="skeleton-card-body">
            <div className="skeleton-pulse skeleton-line-full"></div>
            <div className="skeleton-pulse skeleton-line-mid"></div>
            <div className="skeleton-pulse skeleton-line-short"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonCard;
