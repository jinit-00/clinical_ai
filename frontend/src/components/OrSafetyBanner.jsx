import React from 'react';
import { AlertOctagon } from 'lucide-react';
import './OrSafetyBanner.css';

export const OrSafetyBanner = () => {
  return (
    <div className="or-safety-banner">
      <div className="safety-banner-content">
        <AlertOctagon className="safety-banner-icon" size={20} />
        <div className="safety-banner-text">
          <strong>Demo mode:</strong> the AI does not watch or interpret the video feed. It answers using a pre-written case script prepared ahead of time. The video panel is playback only, for atmosphere, and is not connected to the AI pipeline.
        </div>
      </div>
    </div>
  );
};

export default OrSafetyBanner;
