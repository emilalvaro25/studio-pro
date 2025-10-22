import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';

const SettingsPage: React.FC = () => {
    const { addNotification } = useAppContext();
    const [supabaseUrl, setSupabaseUrl] = useState('');
    const [supabaseAnonKey, setSupabaseAnonKey] = useState('');

    useEffect(() => {
        const storedUrl = localStorage.getItem('supabaseUrl') || 'https://gvpapymyndpxrlsbdvhi.supabase.co';
        const storedKey = localStorage.getItem('supabaseAnonKey') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2cGFweW15bmRweHJsc2JkdmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNTk2NjMsImV4cCI6MjA3NjczNTY2M30.0mMnrD0Zbkai2ypfc3djkHSUVuT9Io4JS6vAmjM6pLA';
        setSupabaseUrl(storedUrl);
        setSupabaseAnonKey(storedKey);
    }, []);

    const handleSave = () => {
        localStorage.setItem('supabaseUrl', supabaseUrl);
        localStorage.setItem('supabaseAnonKey', supabaseAnonKey);
        addNotification('Supabase credentials saved. Please refresh the page for changes to take effect.', 'success');
    };

    const InputField: React.FC<{ label: string; value: string; onChange: (value: string) => void; isSecret?: boolean; }> = ({ label, value, onChange, isSecret = false }) => (
        <div>
            <label className="block text-sm font-medium text-eburon-muted mb-1">{label}</label>
            <input 
                type={isSecret ? "password" : "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"
            />
        </div>
    );

    return (
        <div className="p-6">
            <h1 className="text-xl font-semibold text-eburon-text mb-6">Settings</h1>
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-eburon-card border border-eburon-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">API Keys</h2>
                    <div className="space-y-4">
                        <InputField label="Gemini API Key (Handled by Environment)" value="••••••••••••••••••••••••••••" onChange={() => {}} isSecret />
                    </div>
                </div>
                <div className="bg-eburon-card border border-eburon-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Supabase Credentials</h2>
                    <p className="text-sm text-eburon-muted mb-4">Provide your Supabase project details to enable database and storage features.</p>
                    <div className="space-y-4">
                        <InputField label="Supabase Project URL" value={supabaseUrl} onChange={setSupabaseUrl} />
                        <InputField label="Supabase Anon Key" value={supabaseAnonKey} onChange={setSupabaseAnonKey} isSecret />
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-brand-teal text-eburon-bg font-semibold hover:opacity-90">
                            Save Credentials
                        </button>
                    </div>
                </div>
                <div className="bg-eburon-card border border-eburon-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-eburon-muted mb-1">Default Compute Region</label>
                            <select className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                                <option>us-central1</option>
                                <option>europe-west1</option>
                                <option>asia-east1</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-eburon-muted mb-1">Logging & PII Redaction</label>
                             <input type="range" min="0" max="100" defaultValue="75" className="w-full" />
                             <div className="flex justify-between text-xs text-eburon-muted">
                                 <span>None</span>
                                 <span>Standard</span>
                                 <span>Maximum</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;