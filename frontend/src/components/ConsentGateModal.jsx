import React, { useState } from 'react';
import { ShieldCheck, Mic, AlertCircle } from 'lucide-react';
import './ConsentGateModal.css';

export const ConsentGateModal = ({ onConsentGiven }) => {
  const [patientConsent, setPatientConsent] = useState(false);
  const [clinicianConsent, setClinicianConsent] = useState(false);

  const isReady = patientConsent && clinicianConsent;

  return (
    <div className="consent-gate-wrapper">
      <div className="consent-card">
        <div className="consent-header">
          <div className="consent-icon-badge">
            <ShieldCheck size={28} className="shield-icon" />
          </div>
          <div>
            <h3 className="consent-title">Patient Audio Recording Consent Gate</h3>
            <p className="consent-subtitle">HIPAA / DPDP Compliance & Patient Privacy Protocol</p>
          </div>
        </div>

        <div className="consent-notice-box">
          <AlertCircle size={20} className="notice-icon" />
          <p className="notice-text">
            <strong>Recording audio to detect prescriptions — press Start only with patient consent.</strong>
            <br />
            This feature processes audio stream data in real time to capture prescription orders and check local pharmacy inventory. No raw audio is recorded or stored at rest.
          </p>
        </div>

        <div className="consent-check-list">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={patientConsent}
              onChange={(e) => setPatientConsent(e.target.checked)}
              className="consent-checkbox"
            />
            <span className="checkbox-label">
              Patient has been informed and gave explicit verbal consent to real-time clinical audio monitoring.
            </span>
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={clinicianConsent}
              onChange={(e) => setClinicianConsent(e.target.checked)}
              className="consent-checkbox"
            />
            <span className="checkbox-label">
              Attending clinician confirms all extracted prescription recommendations will undergo mandatory human review.
            </span>
          </label>
        </div>

        <button
          onClick={onConsentGiven}
          disabled={!isReady}
          className="btn-start-consultation"
        >
          <Mic size={18} /> Start Consultation Mode
        </button>
      </div>
    </div>
  );
};

export default ConsentGateModal;
