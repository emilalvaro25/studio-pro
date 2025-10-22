
import React, { useState, useEffect } from 'react';
import { Settings } from 'lucide-react';

type Status = 'Idle' | 'Ready' | 'Live' | 'Calling';
const STATUS_STYLES: { [key in Status]: { text: string; color: string } } = {
  Idle: { text: 'Idle', color: 'bg-eburon-muted' },
  Ready: { text: 'Ready', color: 'bg-ok' },
  Live: { text: 'Live', color: 'bg-brand-teal' },
  Calling: { text: 'Calling...', color: 'bg-warn animate-pulse' },
};


export const Header: React.FC = () => {
    const [status, setStatus] = useState<Status>('Idle');
    
    useEffect(() => {
        // Mock status changes
        const interval = setInterval(() => {
            const statuses: Status[] = ['Idle', 'Ready', 'Live'];
            setStatus(statuses[Math.floor(Math.random() * statuses.length)]);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

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
            <button className="text-eburon-muted hover:text-eburon-text transition-colors">
                <Settings size={20} />
            </button>
        </header>
    );
};
