import React from 'react';
import '../../Styles/Sidebar.css';

interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  section: string;
  active: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, section, active, onClick }) => {
  return (
    <div 
      className={`sidebar-item ${active ? 'active' : ''}`} 
      onClick={onClick}
      data-section={section}
      role="button"
      aria-pressed={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      <div className="sidebar-icon">
        {icon}
      </div>
      <span className="sidebar-text">{text}</span>
    </div>
  );
};

export default SidebarItem;