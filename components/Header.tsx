import React from 'react';
import { Settings } from 'lucide-react';
import { useAppContext } from '../App';

type Status = 'Offline' | 'Live';
const STATUS_STYLES: { [key in Status]: { text: string; color: string } } = {
  Offline: { text: 'Offline', color: 'bg-danger' },
  Live: { text: 'Live', color: 'bg-brand-teal' },
};


export const Header: React.FC = () => {
    const { setView, isSupabaseConnected } = useAppContext();
    const status: Status = isSupabaseConnected ? 'Live' : 'Offline';
    const currentStatus = STATUS_STYLES[status];

    return (
        <header className="flex items-center justify-between h-14 px-4 bg-eburon-card border-b border-eburon-border flex-shrink-0">
            <div className="flex items-center space-x-3">
                <img src="https://eburon.vercel.app/logo-dark.png" alt="Eburon Logo" className="w-6 h-6" />
                <span className="font-semibold text-lg text-eburon-text">Eburon</span>
            </div>
            <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${currentStatus.color}`}></div>
                <span className="text-eburon-muted text-xs">{currentStatus.text}</span>
            </div>
            <button onClick={() => setView('Settings')} className="text-eburon-muted hover:text-eburon-text transition-colors">
                <Settings size={20} />
            </button>
        </header>
    );
};