
import React from 'react';

const SettingsPage: React.FC = () => {

    const InputField: React.FC<{ label: string; value: string; isSecret?: boolean }> = ({ label, value, isSecret = false }) => (
        <div>
            <label className="block text-sm font-medium text-eburon-muted mb-1">{label}</label>
            <input 
                type={isSecret ? "password" : "text"}
                value={value}
                readOnly
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
                        <InputField label="Gemini API Key" value="••••••••••••••••••••••••••••••" isSecret />
                        <InputField label="Telephony Provider Key" value="••••••••••••••••••••" isSecret />
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
