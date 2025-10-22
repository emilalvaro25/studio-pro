// FIX: Import `useEffect` from react to resolve error.
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../App';
import { CallRecord, TranscriptLine } from '../types';
import { Bot, User, PhoneIncoming, Clock, FileText } from 'lucide-react';

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const TranscriptView: React.FC<{ transcript: TranscriptLine[] }> = ({ transcript }) => (
    <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto pr-2 bg-eburon-bg p-4 rounded-lg">
        {transcript.map((line, i) => (
            <div key={i} className={`flex items-start gap-3 ${line.speaker === 'You' ? 'justify-end' : ''}`}>
                {line.speaker === 'Agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center"><Bot size={18} /></div>}
                <div className={`p-3 rounded-lg max-w-lg ${line.speaker === 'You' ? 'bg-eburon-border' : 'bg-eburon-bg border border-eburon-border'} ${line.speaker === 'System' ? 'text-center w-full bg-transparent text-eburon-muted text-xs' : ''}`}>
                    <p>{line.text}</p>
                </div>
                {line.speaker === 'You' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-eburon-border flex items-center justify-center"><User size={18} /></div>}
            </div>
        ))}
    </div>
);

const CallHistoryPage: React.FC = () => {
    const { callHistory } = useAppContext();
    const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const sortedAndFilteredHistory = useMemo(() => {
        return [...callHistory]
            .sort((a, b) => b.startTime - a.startTime)
            .filter(call => call.agentName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [callHistory, searchTerm]);
    
    // Automatically select the first item in the filtered list if no call is selected
    // or if the selected call is no longer in the filtered list
    useEffect(() => {
        if (sortedAndFilteredHistory.length > 0) {
            const isSelectedCallVisible = sortedAndFilteredHistory.some(call => call.id === selectedCall?.id);
            if (!selectedCall || !isSelectedCallVisible) {
                setSelectedCall(sortedAndFilteredHistory[0]);
            }
        } else {
            setSelectedCall(null);
        }
    }, [sortedAndFilteredHistory, selectedCall]);

    return (
        <div className="p-6 h-full flex flex-col">
            <h1 className="text-xl font-semibold text-eburon-text mb-6 flex-shrink-0">Call History</h1>
            <div className="flex-1 bg-eburon-card border border-eburon-border rounded-xl flex overflow-hidden">
                <aside className="w-1/3 border-r border-eburon-border flex flex-col">
                    <div className="p-4 border-b border-eburon-border">
                        <input
                            type="text"
                            placeholder="Search by agent name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-eburon-bg border border-eburon-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredHistory.length > 0 ? (
                            sortedAndFilteredHistory.map(call => (
                                <button
                                    key={call.id}
                                    onClick={() => setSelectedCall(call)}
                                    className={`w-full text-left p-4 border-b border-eburon-border transition-colors ${selectedCall?.id === call.id ? 'bg-brand-teal/10' : 'hover:bg-white/5'}`}
                                >
                                    <p className={`font-semibold ${selectedCall?.id === call.id ? 'text-brand-teal' : 'text-eburon-text'}`}>{call.agentName}</p>
                                    <p className="text-xs text-eburon-muted">{new Date(call.startTime).toLocaleString()}</p>
                                    <p className="text-xs text-eburon-muted">Duration: {formatDuration(call.duration)}</p>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-eburon-muted">No call records found.</div>
                        )}
                    </div>
                </aside>
                <main className="w-2/3 p-6 flex flex-col">
                    {selectedCall ? (
                        <>
                            <div className="flex-shrink-0 mb-4">
                                <h2 className="text-lg font-bold text-eburon-text">{selectedCall.agentName}</h2>
                                <div className="flex items-center space-x-4 text-sm text-eburon-muted mt-1">
                                    <div className="flex items-center space-x-1.5">
                                        <PhoneIncoming size={14} />
                                        <span>{new Date(selectedCall.startTime).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                        <Clock size={14} />
                                        <span>{formatDuration(selectedCall.duration)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 mb-4">
                                <h3 className="text-sm font-semibold text-eburon-muted mb-2">Call Recording (User Audio)</h3>
                                <audio controls src={selectedCall.recordingUrl} className="w-full h-10">
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <h3 className="text-sm font-semibold text-eburon-muted mb-2">Transcript</h3>
                                <TranscriptView transcript={selectedCall.transcript} />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-eburon-muted">
                            <FileText size={48} className="mb-4" />
                            <h2 className="text-lg font-semibold">No Call Selected</h2>
                            <p>Select a call from the list to view its details.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CallHistoryPage;