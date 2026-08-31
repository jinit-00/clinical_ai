import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './DisclaimerFooter.css';

export const DisclaimerFooter = () => {
  return (
    <footer className="disclaimer-footer">
      <div className="disclaimer-content">
        <AlertTriangle className="disclaimer-icon" size={16} />
        <span className="disclaimer-text">
          AI-generated. Not a diagnosis. For informational use — a licensed clinician must review before acting.
        </span>
      </div>
    </footer>
  );
};

export default DisclaimerFooter;
