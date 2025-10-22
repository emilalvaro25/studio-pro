import React from 'react';
import { Home, Bot, Phone, Library, Voicemail, Send, Settings, Database, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAppContext } from '../App';
import { View } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  viewName: View;
  count?: number;
  hasActivity?: boolean;
  isNavOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, viewName, count, hasActivity, isNavOpen }) => {
  const { view, setView } = useAppContext();
  const isActive = view === viewName;

  return (
    <button
      data-id={`nav-${label.toLowerCase().replace(' ', '-')}`}
      onClick={() => setView(viewName)}
      title={!isNavOpen ? label : undefined}
      className={`flex items-center w-full h-10 px-3 rounded-lg text-left transition-colors ${
        isActive
          ? 'bg-white/10 text-eburon-text'
          : 'text-eburon-muted hover:bg-white/5 hover:text-eburon-text'
      } ${!isNavOpen && 'lg:justify-center'}`}
    >
      {icon}
      {isNavOpen && <span className="ml-3 flex-1 whitespace-nowrap">{label}</span>}
      {isNavOpen && count !== undefined && (
        <span className="text-xs bg-eburon-border px-1.5 py-0.5 rounded-full">{count}</span>
      )}
      {isNavOpen && hasActivity && !count && (
         <div className="w-1.5 h-1.5 bg-brand-teal rounded-full"></div>
      )}
    </button>
  );
};

export const LeftNav: React.FC = () => {
    const { agents, callHistory, isLeftNavOpen, setIsLeftNavOpen } = useAppContext();
    return (
        <nav className={`bg-eburon-card border-r border-eburon-border flex flex-col z-40
            fixed inset-y-0 left-0
            transform transition-transform lg:transition-all duration-300 ease-in-out
            ${isLeftNavOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:relative lg:translate-x-0
            ${isLeftNavOpen ? 'w-72 p-4' : 'lg:w-20 lg:p-2'}
        `}>
            <div className="space-y-2">
                <NavItem icon={<Home size={20} />} label="Home" viewName="Home" isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Bot size={20} />} label="Agents" viewName="Agents" count={agents.length} isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Phone size={20} />} label="Calls" viewName="Calls" count={callHistory.length} isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Library size={20} />} label="Knowledge" viewName="Knowledge" count={3} isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Voicemail size={20} />} label="Voices" viewName="Voices" isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Send size={20} />} label="Deploy" viewName="Deploy" isNavOpen={isLeftNavOpen} />
                <NavItem icon={<Database size={20} />} label="Database" viewName="Database" isNavOpen={isLeftNavOpen} />
            </div>
            <div className="flex-grow"></div>
            <div className="space-y-2">
                <NavItem icon={<Settings size={20} />} label="Settings" viewName="Settings" isNavOpen={isLeftNavOpen} />
                <div className="hidden lg:block pt-2 border-t border-eburon-border">
                    <button onClick={() => setIsLeftNavOpen(prev => !prev)} 
                        className={`w-full flex items-center h-10 px-3 rounded-lg text-eburon-muted hover:bg-white/5 hover:text-eburon-text ${!isLeftNavOpen && 'justify-center'}`}
                        aria-label={isLeftNavOpen ? "Collapse navigation" : "Expand navigation"}
                    >
                        {isLeftNavOpen ? 
                            <span className="flex items-center w-full"><ChevronsLeft size={20} /><span className="ml-3">Collapse</span></span> : 
                            <ChevronsRight size={20} />
                        }
                    </button>
                </div>
            </div>
        </nav>
    );
};
