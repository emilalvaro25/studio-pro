import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, text, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group flex items-center">
      {children}
      <div
        className={`absolute whitespace-nowrap bg-panel text-text text-xs rounded-md py-1 px-2.5 transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none z-50 border border-border shadow-lg ${positionClasses[position]}`}
      >
        {text}
      </div>
    </div>
  );
};

export default Tooltip;
