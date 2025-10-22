import React, { useState, useEffect, useRef } from 'react';
import { Menu, PanelRight, User as UserIcon, LogOut, Sun, Moon, Settings } from 'lucide-react';
import { useAppContext } from '../App';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
        return createClient(url, key);
    }
    return null;
}

const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useAppContext();

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full text-muted hover:text-text hover:bg-card transition-colors"
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
    );
};


export const Header: React.FC = () => {
    const { isSupabaseConnected, setIsLeftNavOpen, setIsRightPanelOpen, user, setView } = useAppContext();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const status = isSupabaseConnected ? 'Live' : 'Offline';

    const handleSignOut = async () => {
        const supabase = getSupabaseClient();
        if (supabase) {
            await supabase.auth.signOut();
        }
    };

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
        <header className="flex items-center justify-between h-14 px-4 bg-card border-b border-border flex-shrink-0 z-50">
            <div className="flex items-center space-x-3">
                 <button onClick={() => setIsLeftNavOpen(prev => !prev)} className="p-1 rounded-md text-muted hover:text-text lg:hidden" aria-label="Toggle navigation">
                    <Menu size={24} />
                </button>
                <div className="flex items-center space-x-2">
                    <img src="https://eburon.vercel.app/logo-dark.png" alt="Eburon Logo" className="h-7 w-7 dark:invert-0 invert" />
                </div>
            </div>
            <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${status === 'Live' ? 'bg-brand-teal' : 'bg-danger'}`}></div>
                <span className="text-muted text-xs">{status}</span>
            </div>
            <div className="flex items-center space-x-2">
                <ThemeToggle />
                <div className="relative" ref={profileRef}>
                    <button onClick={() => setIsProfileOpen(prev => !prev)} className="p-2 rounded-full text-muted hover:text-text hover:bg-background transition-colors" aria-label="Open user menu">
                        <UserIcon size={20} />
                    </button>
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg py-1">
                            <div className="px-3 py-2 border-b border-border">
                                <p className="text-sm font-medium text-text truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => { setView('Profile'); setIsProfileOpen(false); }}
                                className="w-full text-left flex items-center px-3 py-2 text-sm text-muted hover:bg-background hover:text-text"
                            >
                                <UserIcon size={16} className="mr-2" />
                                User Profile
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left flex items-center px-3 py-2 text-sm text-danger hover:bg-danger/10"
                            >
                                <LogOut size={16} className="mr-2" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
                <button onClick={() => setIsRightPanelOpen(prev => !prev)} className="p-1 rounded-md text-muted hover:text-text lg:hidden" aria-label="Toggle details panel">
                    <PanelRight size={24} />
                </button>
            </div>
        </header>
    );
};
