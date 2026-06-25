import React from 'react';
import { MessageSquare, HelpCircle, Award, Network } from 'lucide-react';
import './SidebarTabs.css';

export default function SidebarTabs({ activeTab, setActiveTab, t, children }) {
  const tabs = [
    { id: 'chat', label: t('tabChat'), icon: <MessageSquare size={16} /> },
    { id: 'flashcards', label: t('tabFlashcards'), icon: <HelpCircle size={16} /> },
    { id: 'quiz', label: t('tabQuiz'), icon: <Award size={16} /> },
    { id: 'mindmap', label: t('tabMindmap'), icon: <Network size={16} /> }
  ];

  return (
    <div className="sidebar-tabs-container">
      <div className="tabs-header-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-header-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-content-wrapper">
        {children}
      </div>
    </div>
  );
}
