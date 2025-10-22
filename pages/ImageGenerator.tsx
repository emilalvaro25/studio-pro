import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../services/audioUtils';
import { useAppContext } from '../App';
import { Play, Loader2, Save, User, Brain, Voicemail, Library, TestTube } from 'lucide-react';

const voices = [
    { name: 'Natural Warm', prebuilt: 'Kore' },
    { name: 'Professional Male', prebuilt: 'Puck' },
    { name: 'Upbeat Female', prebuilt: 'Zephyr' },
    { name: 'Calm Narrator', prebuilt: 'Charon' },
    { name: 'Friendly', prebuilt: 'Fenrir' },
];

type BuilderTab = 'Identity' | 'Brain' | 'Voice' | 'Knowledge' | 'Test';

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ isActive, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isActive ? 'bg-brand-teal/10 text-brand-teal' : 'text-eburon-muted hover:bg-white/5'
        }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);


const AgentBuilderPage: React.FC = () => {
    const { selectedAgent, setView } = useAppContext();
    const [activeTab, setActiveTab] = useState<BuilderTab>('Voice');
    
    const [selectedVoice, setSelectedVoice] = useState(selectedAgent?.voice || 'Natural Warm');
    const [speakingRate, setSpeakingRate] = useState(1.0);
    const [playingVoice, setPlayingVoice] = useState<boolean>(false);
    const [loadingVoice, setLoadingVoice] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    if (!selectedAgent) {
        return (
            <div className="p-6 text-center text-eburon-muted h-full flex flex-col items-center justify-center">
                <p className="text-lg">No agent selected.</p>
                <p>Please select an agent from the list to begin editing.</p>
                <button onClick={() => setView('Agents')} className="mt-4 px-4 py-2 bg-brand-teal text-eburon-bg rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Go to Agents
                </button>
            </div>
        );
    }
    
    const playPreview = async () => {
        if (loadingVoice || playingVoice) return;
        
        setLoadingVoice(true);
        setError(null);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API key is not configured.");
            }

            const voicePrebuilt = voices.find(v => v.name === selectedVoice)?.prebuilt || 'Kore';
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `This is a preview of the ${selectedVoice} voice.` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: voicePrebuilt },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
                setPlayingVoice(true);
                source.onended = () => {
                    setPlayingVoice(false);
                    outputAudioContext.close();
                };
            } else {
                throw new Error("No audio was generated.");
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : "An unknown error occurred.");
        } finally {
            setLoadingVoice(false);
        }
    };
    
    const renderContent = () => {
        switch(activeTab) {
            case 'Voice': return (
                 <div className="space-y-6 max-w-sm">
                    {error && <p className="text-danger text-sm">{error}</p>}
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Voice</label>
                        <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                            {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Speaking Rate ({speakingRate.toFixed(1)}x)</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={speakingRate} onChange={e => setSpeakingRate(parseFloat(e.target.value))} className="w-full h-2 bg-eburon-border rounded-lg appearance-none cursor-pointer accent-brand-teal" />
                    </div>
                    <button onClick={playPreview} disabled={loadingVoice || playingVoice} className="flex items-center space-x-2 bg-eburon-border text-eburon-text font-semibold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loadingVoice ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                        <span>{loadingVoice ? 'Generating...' : (playingVoice ? 'Playing...' : 'Preview')}</span>
                    </button>
                </div>
            );
            default: return <div className="text-eburon-muted">Configuration for {activeTab} will be here.</div>
        }
    };

    const tabs: {id: BuilderTab, icon: React.ReactNode, label: string}[] = [
        { id: 'Identity', icon: <User size={18} />, label: 'Identity' },
        { id: 'Brain', icon: <Brain size={18} />, label: 'Brain' },
        { id: 'Voice', icon: <Voicemail size={18} />, label: 'Voice' },
        { id: 'Knowledge', icon: <Library size={18} />, label: 'Knowledge' },
        { id: 'Test', icon: <TestTube size={18} />, label: 'Test' },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <button onClick={() => setView('Agents')} className="text-sm text-eburon-muted hover:text-eburon-text mb-1">&larr; Back to Agents</button>
                    <h1 className="text-xl font-semibold text-eburon-text">
                        <span className="text-eburon-muted font-normal">Editing:</span> {selectedAgent.name}
                    </h1>
                </div>
                <button className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    <Save size={18} />
                    <span>Save</span>
                </button>
            </div>
            <div className="bg-eburon-card border border-eburon-border rounded-xl flex-1 flex flex-col">
                <div className="p-4 border-b border-eburon-border flex items-center space-x-2 overflow-x-auto">
                    {tabs.map(tab => (
                        <TabButton 
                            key={tab.id}
                            isActive={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            icon={tab.icon}
                            label={tab.label}
                        />
                    ))}
                </div>
                <div className="p-6 flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AgentBuilderPage;
