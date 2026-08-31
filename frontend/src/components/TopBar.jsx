import React from 'react';
import { User, ChevronDown, Calendar, FileText } from 'lucide-react';
import { usePatient } from '../context/PatientContext';
import './TopBar.css';

export const TopBar = ({ activeTabTitle }) => {
  const { patients, selectedPatient, selectedPatientId, setSelectedPatientId } = usePatient();

  return (
    <header className="topbar">
      <div className="topbar-title-section">
        <h2 className="active-page-title">{activeTabTitle}</h2>
      </div>

      <div className="topbar-patient-section">
        <div className="patient-selector-card">
          <div className="patient-avatar">
            <User size={18} className="avatar-icon" />
          </div>
          <div className="patient-info">
            <div className="patient-picker-row">
              <label htmlFor="patient-select" className="picker-label">Active Patient:</label>
              <div className="select-wrapper">
                <select
                  id="patient-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="patient-select-dropdown"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y, {p.sex})
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="select-arrow" />
              </div>
            </div>
            <div className="patient-meta-row">
              <span className="meta-item">
                <Calendar size={12} /> Last Visit: {selectedPatient?.last_visit}
              </span>
              <span className="meta-item history">
                <FileText size={12} /> {selectedPatient?.medical_history}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
