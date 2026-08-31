import React, { useState } from 'react';
import { PatientProvider } from './context/PatientContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DisclaimerFooter from './components/DisclaimerFooter';

import MriReviewPage from './pages/MriReviewPage';
import BloodworkReviewPage from './pages/BloodworkReviewPage';
import ConsultationPage from './pages/ConsultationPage';
import LiveOrPage from './pages/LiveOrPage';

import './styles/theme.css';

export function AppContent() {
  const [activeTab, setActiveTab] = useState('mri');

  const getTabTitle = () => {
    switch (activeTab) {
      case 'mri':
        return 'MRI Volumetric Review & Scan Analysis';
      case 'bloodwork':
        return 'Bloodwork & Lab Biomarker Panel';
      case 'consultation':
        return 'Live Consultation & Prescription Capture';
      case 'live_or':
        return 'Live OR Mode (Multi-Agent Scripted Demo)';
      default:
        return 'Clinical AI Copilot';
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'mri':
        return <MriReviewPage />;
      case 'bloodwork':
        return <BloodworkReviewPage />;
      case 'consultation':
        return <ConsultationPage />;
      case 'live_or':
        return <LiveOrPage />;
      default:
        return <MriReviewPage />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="main-wrapper">
        <TopBar activeTabTitle={getTabTitle()} />
        <main className="content-area">
          {renderActivePage()}
        </main>
        <DisclaimerFooter />
      </div>
    </div>
  );
}

export function App() {
  return (
    <PatientProvider>
      <AppContent />
    </PatientProvider>
  );
}

export default App;
