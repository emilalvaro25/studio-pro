import React from 'react';
import { Home, Bot, Phone, Library, Voicemail, Send, Settings } from 'lucide-react';
import { useAppContext } from '../App';
import { View } from '../types';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  viewName: View;
  count?: number;
  hasActivity?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, viewName, count, hasActivity }) => {
  const { view, setView } = useAppContext();
  const isActive = view === viewName;

  return (
    <button
      data-id={`nav-${label.toLowerCase()}`}
      onClick={() => setView(viewName)}
      className={`flex items-center w-full h-10 px-3 rounded-lg text-left transition-colors ${
        isActive
          ? 'bg-white/10 text-eburon-text'
          : 'text-eburon-muted hover:bg-white/5 hover:text-eburon-text'
      }`}
    >
      {icon}
      <span className="ml-3 flex-1">{label}</span>
      {count && (
        <span className="text-xs bg-eburon-border px-1.5 py-0.5 rounded-full">{count}</span>
      )}
      {hasActivity && !count && (
         <div className="w-1.5 h-1.5 bg-brand-teal rounded-full"></div>
      )}
    </button>
  );
};

export const LeftNav: React.FC = () => {
    const { agents } = useAppContext();
    return (
        <nav className="w-72 bg-eburon-card border-r border-eburon-border p-4 flex flex-col space-y-2">
            <NavItem icon={<Home size={20} />} label="Home" viewName="Home" />
            <NavItem icon={<Bot size={20} />} label="Agents" viewName="Agents" count={agents.length} />
            <NavItem icon={<Phone size={20} />} label="Calls" viewName="Calls" hasActivity />
            <NavItem icon={<Library size={20} />} label="Knowledge" viewName="Knowledge" count={3} />
            <NavItem icon={<Voicemail size={20} />} label="Voices" viewName="Voices" />
            <NavItem icon={<Send size={20} />} label="Deploy" viewName="Deploy" />
            <div className="flex-grow"></div>
            <NavItem icon={<Settings size={20} />} label="Settings" viewName="Settings" />
        </nav>
    );
};