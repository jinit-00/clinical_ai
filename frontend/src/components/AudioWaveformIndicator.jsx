import React from 'react';
import { Volume2 } from 'lucide-react';
import './AudioWaveformIndicator.css';

/**
 * AudioWaveformIndicator Component
 * Animated pulsing audio waveform indicating active assistant speech playback.
 */
export const AudioWaveformIndicator = ({ isSpeaking = false, label = "Assistant Speaking..." }) => {
  if (!isSpeaking) return null;

  return (
    <div className="audio-waveform-container">
      <Volume2 className="volume-icon" size={18} />
      <span className="waveform-label">{label}</span>
      <div className="waveform-bars">
        <div className="bar bar1"></div>
        <div className="bar bar2"></div>
        <div className="bar bar3"></div>
        <div className="bar bar4"></div>
        <div className="bar bar5"></div>
      </div>
    </div>
  );
};

export default AudioWaveformIndicator;
