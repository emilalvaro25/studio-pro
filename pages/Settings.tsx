import React, { useState, useEffect } from 'react';
import { useAppContext } from '../App';

const SettingsPage: React.FC = () => {
    const { addNotification } = useAppContext();
    const [defaultRegion, setDefaultRegion] = useState('us-central1');
    const [loggingLevel, setLoggingLevel] = useState(75);


    useEffect(() => {
        const storedRegion = localStorage.getItem('defaultRegion') || 'us-central1';
        setDefaultRegion(storedRegion);

        const storedLogging = localStorage.getItem('loggingLevel') || '75';
        setLoggingLevel(parseInt(storedLogging, 10));

    }, []);

    const handleSave = () => {
        localStorage.setItem('defaultRegion', defaultRegion);
        localStorage.setItem('loggingLevel', String(loggingLevel));
        addNotification('Settings saved successfully. Refresh might be needed for some changes.', 'success');
    };

    const InputField: React.FC<{ label: string; value: string; onChange: (value: string) => void; isSecret?: boolean; disabled?: boolean; }> = ({ label, value, onChange, isSecret = false, disabled = false }) => (
        <div>
            <label className="block text-sm font-medium text-eburon-muted mb-1">{label}</label>
            <input 
                type={isSecret ? "password" : "text"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <InputField label="Gemini API Key" value="Configured via environment variable" onChange={() => {}} isSecret disabled />
                    </div>
                </div>
                <div className="bg-eburon-card border border-eburon-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Supabase Credentials</h2>
                    <p className="text-sm text-eburon-muted mb-4">Your Supabase project details are configured via environment variables for security.</p>
                    <div className="space-y-4">
                        <InputField label="Supabase Project URL" value="Configured via environment variable" onChange={() => {}} disabled />
                        <InputField label="Supabase Anon Key" value="Configured via environment variable" onChange={() => {}} isSecret disabled />
                    </div>
                </div>
                <div className="bg-eburon-card border border-eburon-border rounded-xl p-6">
                    <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-eburon-muted mb-1">Default Compute Region</label>
                            <select value={defaultRegion} onChange={e => setDefaultRegion(e.target.value)} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                                <option>us-central1</option>
                                <option>europe-west1</option>
                                <option>asia-east1</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-eburon-muted mb-1">Logging & PII Redaction</label>
                             <input type="range" min="0" max="100" value={loggingLevel} onChange={e => setLoggingLevel(parseInt(e.target.value, 10))} className="w-full h-2 bg-eburon-border rounded-lg appearance-none cursor-pointer accent-brand-teal" />
                             <div className="flex justify-between text-xs text-eburon-muted">
                                 <span>None</span>
                                 <span>Standard</span>
                                 <span>Maximum</span>
                             </div>
                        </div>
                    </div>
                </div>
                 <div className="flex justify-end">
                    <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-brand-teal text-eburon-bg font-semibold hover:opacity-90">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;