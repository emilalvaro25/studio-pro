import React, { useState, useMemo } from 'react';
import { X, Save, History, Check, GitCompareArrows, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentVersion } from '../types';

interface AgentVersionsModalProps {
    data: {
        agent: Agent;
        builderState?: Agent;
    };
    onClose: () => void;
}

const DiffRow: React.FC<{ label: string; val1: any; val2: any; isJson?: boolean }> = ({ label, val1, val2, isJson }) => {
    const v1 = isJson ? JSON.stringify(val1, null, 2) : String(val1);
    const v2 = isJson ? JSON.stringify(val2, null, 2) : String(val2);
    const isDifferent = v1 !== v2;

    return (
        <div className={`p-2 rounded-lg ${isDifferent ? 'bg-warn/10' : ''}`}>
            <h4 className="text-xs font-semibold text-eburon-muted mb-1">{label}</h4>
            <div className={`grid grid-cols-2 gap-4 font-mono text-xs ${isDifferent ? 'text-warn' : 'text-eburon-text'}`}>
                <pre className="whitespace-pre-wrap break-words">{v1}</pre>
                <pre className="whitespace-pre-wrap break-words">{v2}</pre>
            </div>
        </div>
    );
};

const VersionComparer: React.FC<{ version1: AgentVersion; version2: AgentVersion; onBack: () => void }> = ({ version1, version2, onBack }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-eburon-muted hover:text-eburon-text"><ArrowLeft size={20} /></button>
                    <div>
                        <h3 className="text-md font-semibold text-eburon-text">Comparing Versions</h3>
                        <p className="text-xs text-eburon-muted">Version {version1.versionNumber} vs Version {version2.versionNumber}</p>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm font-semibold border-b border-eburon-border pb-2 mb-2">
                <div>Version {version1.versionNumber} ({version1.description})</div>
                <div>Version {version2.versionNumber} ({version2.description})</div>
            </div>
            <div className="overflow-y-auto space-y-2 pr-2">
                <DiffRow label="Name" val1={version1.name} val2={version2.name} />
                <DiffRow label="Persona (Short)" val1={version1.personaShortText} val2={version2.personaShortText} />
                <DiffRow label="Intro Spiel" val1={version1.introSpiel} val2={version2.introSpiel} isJson />
                <DiffRow label="Voice" val1={version1.voice} val2={version2.voice} />
                <DiffRow label="Voice Description" val1={version1.voiceDescription} val2={version2.voiceDescription} />
                <DiffRow label="Tools" val1={version1.tools} val2={version2.tools} isJson />
                <DiffRow label="System Prompt" val1={version1.persona} val2={version2.persona} />
            </div>
        </div>
    );
};


const AgentVersionsModal: React.FC<AgentVersionsModalProps> = ({ data, onClose }) => {
    const { saveAgentVersion, restoreAgentVersion } = useAppContext();
    const { agent, builderState } = data;
    const [description, setDescription] = useState('');
    
    const [compareSelection, setCompareSelection] = useState<string[]>([]);
    const [compareView, setCompareView] = useState<[AgentVersion, AgentVersion] | null>(null);

    const currentState = useMemo(() => builderState || agent, [builderState, agent]);
    const sortedHistory = useMemo(() => [...agent.history].sort((a, b) => b.versionNumber - a.versionNumber), [agent.history]);
    const latestVersionNumber = sortedHistory[0]?.versionNumber || 0;
    
    const isCurrentStateDifferentFromLatestVersion = useMemo(() => {
        const latestVersion = sortedHistory[0];
        if (!latestVersion) return true; // No versions exist, so current state is "different"
        
        return (
            latestVersion.name !== currentState.name ||
            latestVersion.personaShortText !== currentState.personaShortText ||
            latestVersion.voice !== currentState.voice ||
            latestVersion.voiceDescription !== currentState.voiceDescription ||
            JSON.stringify(latestVersion.tools.sort()) !== JSON.stringify(currentState.tools.sort()) ||
            JSON.stringify(latestVersion.introSpiel) !== JSON.stringify(currentState.introSpiel) ||
            latestVersion.persona !== currentState.persona
        );
    }, [currentState, sortedHistory]);

    const handleSave = () => {
        if (!description.trim()) {
            alert('Please provide a description for the new version.');
            return;
        }
        saveAgentVersion(agent.id, description, currentState);
        setDescription('');
    };

    const handleRestore = (versionId: string) => {
        if (window.confirm('Are you sure you want to restore this version? Your current unsaved changes will be lost.')) {
            restoreAgentVersion(agent.id, versionId);
            onClose();
        }
    };
    
    const handleCompareToggle = (versionId: string) => {
        setCompareSelection(prev => {
            if (prev.includes(versionId)) {
                return prev.filter(id => id !== versionId);
            }
            if (prev.length < 2) {
                return [...prev, versionId];
            }
            return [prev[1], versionId]; // Keep the last one, add the new one
        });
    };

    const startComparison = () => {
        if (compareSelection.length !== 2) return;
        const v1 = agent.history.find(v => v.id === compareSelection[0]);
        const v2 = agent.history.find(v => v.id === compareSelection[1]);
        if (v1 && v2) {
            // Ensure v1 is the older version
            setCompareView(v1.versionNumber < v2.versionNumber ? [v1, v2] : [v2, v1]);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-eburon-card border border-eburon-border rounded-xl p-6 w-full max-w-3xl h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {compareView ? (
                    <VersionComparer version1={compareView[0]} version2={compareView[1]} onBack={() => setCompareView(null)} />
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-4 flex-shrink-0">
                            <h2 className="text-lg font-semibold">Version History for <span className="text-brand-teal">{agent.name}</span></h2>
                            <button onClick={onClose}><X size={20} className="text-eburon-muted hover:text-eburon-text"/></button>
                        </div>

                        {isCurrentStateDifferentFromLatestVersion && (
                           <div className="p-4 bg-eburon-bg border border-eburon-border rounded-lg mb-4 flex-shrink-0">
                                <h3 className="text-sm font-semibold text-eburon-text mb-2">Save Current Changes as New Version</h3>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder={`Version ${latestVersionNumber + 1} description (e.g., added new tool)`}
                                        className="flex-1 bg-eburon-border/50 border border-eburon-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                                    />
                                    <button onClick={handleSave} className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                                        <Save size={16} />
                                        <span>Save Version</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto pr-2">
                             <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-semibold text-eburon-muted">History ({sortedHistory.length} versions)</h3>
                                <button
                                    onClick={startComparison}
                                    disabled={compareSelection.length !== 2}
                                    className="flex items-center space-x-2 text-sm bg-eburon-border px-3 py-1 rounded-md hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <GitCompareArrows size={14} />
                                    <span>Compare Selected</span>
                                </button>
                            </div>
                            <div className="space-y-2">
                                {sortedHistory.map(version => {
                                    const isSelectedForCompare = compareSelection.includes(version.id);
                                    return (
                                        <div key={version.id} className={`p-3 rounded-lg flex items-center justify-between transition-colors ${isSelectedForCompare ? 'bg-brand-gold/10' : 'bg-eburon-bg'}`}>
                                            <div className="flex items-center space-x-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelectedForCompare}
                                                    onChange={() => handleCompareToggle(version.id)}
                                                    className="form-checkbox h-4 w-4 bg-eburon-border text-brand-gold rounded focus:ring-brand-gold"
                                                />
                                                <div>
                                                    <p className="font-semibold text-eburon-text">
                                                        Version {version.versionNumber}
                                                        <span className="ml-2 text-xs font-normal bg-eburon-border px-1.5 py-0.5 rounded">{version.createdAt}</span>
                                                    </p>
                                                    <p className="text-sm text-eburon-muted">{version.description}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <button
                                                    onClick={() => handleRestore(version.id)}
                                                    className="text-sm text-eburon-muted hover:text-brand-teal font-medium flex items-center space-x-1.5"
                                                >
                                                    <History size={14} />
                                                    <span>Restore</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AgentVersionsModal;