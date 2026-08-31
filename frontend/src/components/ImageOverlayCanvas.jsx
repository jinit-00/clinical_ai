import React, { useRef, useState, useEffect } from 'react';
import './ImageOverlayCanvas.css';

/**
 * ImageOverlayCanvas Component
 * Displays MRI scan image with interactive bounding box overlays for detected ROI regions.
 */
export const ImageOverlayCanvas = ({ imageUrl, findings = [], dimensions }) => {
  const [selectedFinding, setSelectedFinding] = useState(null);

  if (!imageUrl) return null;

  return (
    <div className="overlay-canvas-wrapper">
      <div className="image-container">
        <img src={imageUrl} alt="MRI Slice" className="mri-base-image" />
        
        {/* Render Bounding Box SVG Overlay */}
        <svg className="svg-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          {findings.map((item, idx) => {
            const box = item.box_2d || [200, 200, 600, 600]; // [ymin, xmin, ymax, xmax]
            const ymin = box[0];
            const xmin = box[1];
            const ymax = box[2];
            const xmax = box[3];
            const width = xmax - xmin;
            const height = ymax - ymin;

            const isWarning = item.severity === 'warning' || item.severity === 'critical';
            const strokeColor = isWarning ? 'var(--accent-warn)' : 'var(--accent-safe)';
            const fillColor = isWarning ? 'rgba(181, 101, 74, 0.2)' : 'rgba(110, 127, 92, 0.2)';

            return (
              <g key={idx} onClick={() => setSelectedFinding(item)} style={{ cursor: 'pointer' }}>
                <rect
                  x={xmin}
                  y={ymin}
                  width={width}
                  height={height}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="6"
                  rx="8"
                />
                <text
                  x={xmin + 10}
                  y={Math.max(ymin - 12, 30)}
                  fill={strokeColor}
                  fontSize="28"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {item.region}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedFinding && (
        <div className="finding-tooltip-card">
          <div className="tooltip-header">
            <strong>Region: {selectedFinding.region}</strong>
            <button onClick={() => setSelectedFinding(null)} className="tooltip-close">×</button>
          </div>
          <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{selectedFinding.observation}</p>
        </div>
      )}
    </div>
  );
};

export default ImageOverlayCanvas;
