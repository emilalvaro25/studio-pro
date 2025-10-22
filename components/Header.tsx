import React from 'react';
import { Settings, Menu, PanelRight } from 'lucide-react';
import { useAppContext } from '../App';

type Status = 'Offline' | 'Live';
const STATUS_STYLES: { [key in Status]: { text: string; color: string } } = {
  Offline: { text: 'Offline', color: 'bg-danger' },
  Live: { text: 'Live', color: 'bg-brand-teal' },
};


export const Header: React.FC = () => {
    const { setView, isSupabaseConnected, setIsLeftNavOpen, setIsRightPanelOpen } = useAppContext();
    const status: Status = isSupabaseConnected ? 'Live' : 'Offline';
    const currentStatus = STATUS_STYLES[status];

    return (
        <header className="flex items-center justify-between h-14 px-4 bg-eburon-card border-b border-eburon-border flex-shrink-0 z-50">
            <div className="flex items-center space-x-3">
                 <button onClick={() => setIsLeftNavOpen(prev => !prev)} className="p-1 rounded-md text-eburon-muted hover:text-eburon-text lg:hidden" aria-label="Toggle navigation">
                    <Menu size={24} />
                </button>
                <div className="hidden lg:flex items-center space-x-3">
                    <div className="flex items-center justify-center w-7 h-7 bg-brand-teal rounded-md" aria-label="Eburon Logo">
                        <span className="text-eburon-bg font-bold text-lg leading-none">E</span>
                    </div>
                    <span className="font-semibold text-lg text-eburon-text">Eburon</span>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${currentStatus.color}`}></div>
                <span className="text-eburon-muted text-xs">{currentStatus.text}</span>
            </div>
            <div className="flex items-center space-x-2">
                <button onClick={() => setView('Settings')} className="text-eburon-muted hover:text-eburon-text transition-colors" aria-label="Open settings">
                    <Settings size={20} />
                </button>
                <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-1 rounded-md text-eburon-muted hover:text-eburon-text lg:hidden" aria-label="Toggle details panel">
                    <PanelRight size={24} />
                </button>
            </div>
        </header>
    );
};