import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Menu, PanelRight, User as UserIcon, LogOut, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../App';
import Tooltip from './Tooltip';

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useAppContext();

    return (
        <Tooltip text={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} position="bottom">
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full text-subtle hover:text-text hover:bg-panel transition-colors"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </Tooltip>
    );
};


export const Header: React.FC = () => {
    const { isSupabaseConnected, setIsLeftNavOpen, setIsRightPanelOpen, user, setView, isDemoMode, session } = useAppContext();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    const { status, statusColor } = useMemo(() => {
        if (isDemoMode) {
            return { status: 'Demo Mode', statusColor: 'bg-warn' };
        }
        if (session) {
            return { status: 'Live', statusColor: 'bg-ok' };
        }
        return { status: 'Offline', statusColor: 'bg-danger' };
    }, [isDemoMode, session]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="flex items-center justify-between h-16 px-4 bg-surface/80 backdrop-blur-sm border-b border-border/70 flex-shrink-0 z-50">
            <div className="flex items-center space-x-3">
                 <button onClick={() => setIsLeftNavOpen(prev => !prev)} className="p-2 rounded-md text-subtle hover:text-text lg:hidden" aria-label="Toggle navigation">
                    <Menu size={24} />
                </button>
                <div className="flex items-center">
                    <img src="https://eburon.vercel.app/logo-dark.png" alt="Eburon Logo" className="h-[55px] w-[140px] object-contain dark:invert-0 invert" />
                </div>
            </div>
            
            <div className="flex items-center space-x-4">
                <div className="hidden md:flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor} transition-colors`}></div>
                    <span className="text-subtle text-xs font-medium">{status}</span>
                </div>
                <ThemeToggle />
                <div className="relative" ref={profileRef}>
                    <Tooltip text="User Menu" position="bottom">
                        <button onClick={() => setIsProfileOpen(prev => !prev)} className="p-2 rounded-full text-subtle hover:text-text hover:bg-panel transition-colors" aria-label="Open user menu">
                            <UserIcon size={20} />
                        </button>
                    </Tooltip>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg py-1">
                            <div className="px-3 py-2 border-b border-border">
                                <p className="text-sm font-medium text-text truncate">{user?.is_anonymous ? 'Guest User' : user?.email}</p>
                            </div>
                            <button
                                onClick={() => { setView('Profile'); setIsProfileOpen(false); }}
                                className="w-full text-left flex items-center px-3 py-2 text-sm text-subtle hover:bg-panel hover:text-text"
                            >
                                <UserIcon size={16} className="mr-2" />
                                User Profile
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-2 rounded-md text-subtle hover:text-text lg:hidden" aria-label="Toggle details panel">
                    <PanelRight size={24} />
                </button>
            </div>
        </header>
    );
};