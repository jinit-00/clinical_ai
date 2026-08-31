import React from 'react';
import { Activity, Droplet, Stethoscope, Video, ShieldAlert } from 'lucide-react';
import './Sidebar.css';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    {
      id: 'mri',
      label: 'MRI Review',
      icon: Activity,
      description: 'Volumetric & slice scanning'
    },
    {
      id: 'bloodwork',
      label: 'Blood Report Review',
      icon: Droplet,
      description: 'Lab values & flagging'
    },
    {
      id: 'consultation',
      label: 'Consultation Mode',
      icon: Stethoscope,
      description: 'Live audio & prescription capture'
    },
    {
      id: 'live_or',
      label: 'Live OR Mode (Demo)',
      icon: Video,
      description: 'Multi-agent surgical script copilot'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <ShieldAlert className="logo-icon" size={24} />
        </div>
        <div className="brand-info">
          <h1 className="brand-title">Clinical AI Copilot</h1>
          <span className="brand-tag">Decision Support</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group-label">Clinical Workflows</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon className="nav-icon" size={20} />
              <div className="nav-label-wrapper">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="portfolio-badge">
          <span>Portfolio Demo Project</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
