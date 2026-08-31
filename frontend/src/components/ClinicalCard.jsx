import React from 'react';
import './ClinicalCard.css';

/**
 * Reusable ClinicalCard Component
 * @param {string} title - Main header for the card
 * @param {string} subtitle - Optional secondary header or description
 * @param {'normal'|'warning'|'critical'} status - Determines border highlight (sage for normal, terracotta for warning/critical)
 * @param {React.ReactNode} action - Optional top-right action button/element
 * @param {React.ReactNode} children - Card content
 */
export const ClinicalCard = ({
  title,
  subtitle,
  status = 'normal',
  action,
  children,
  className = ''
}) => {
  const isWarningOrCritical = status === 'warning' || status === 'critical';
  const statusClass = isWarningOrCritical ? 'status-warning' : 'status-normal';

  return (
    <div className={`clinical-card ${statusClass} ${className}`}>
      <div className="clinical-card-header">
        <div className="clinical-card-title-group">
          {title && <h3 className="clinical-card-title">{title}</h3>}
          {subtitle && <p className="clinical-card-subtitle">{subtitle}</p>}
        </div>
        <div className="clinical-card-header-right">
          <span className={`status-badge ${statusClass}`}>
            {status.toUpperCase()}
          </span>
          {action && <div className="clinical-card-action">{action}</div>}
        </div>
      </div>
      <div className="clinical-card-body">
        {children}
      </div>
    </div>
  );
};

export default ClinicalCard;
