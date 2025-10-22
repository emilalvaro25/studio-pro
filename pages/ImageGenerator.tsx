import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../services/audioUtils';
import { useAppContext } from '../App';
import { Play, Loader2, Save, User, Brain, Voicemail, Library, TestTube, Phone, CheckSquare, Square } from 'lucide-react';
import { Agent, AgentTool } from '../types';

const voices = [
    { name: 'Natural Warm', prebuilt: 'Kore' },
    { name: 'Professional Male', prebuilt: 'Puck' },
    { name: 'Upbeat Female', prebuilt: 'Zephyr' },
    { name: 'Calm Narrator', prebuilt: 'Charon' },
    { name: 'Friendly', prebuilt: 'Fenrir' },
];

const ALL_TOOLS: AgentTool[] = ['Knowledge', 'Webhook', 'Calendar', 'Payments'];

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
    const { selectedAgent, setView, agents, setAgents } = useAppContext();
    const [activeTab, setActiveTab] = useState<BuilderTab>('Identity');
    
    const [formData, setFormData] = useState<Agent | null>(selectedAgent);
    
    const [speakingRate, setSpeakingRate] = useState(1.0);
    const [bargeIn, setBargeIn] = useState(true);
    const [playingVoice, setPlayingVoice] = useState<boolean>(false);
    const [loadingVoice, setLoadingVoice] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(selectedAgent);
    }, [selectedAgent]);

    if (!selectedAgent || !formData) {
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
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleToolToggle = (tool: AgentTool) => {
        setFormData(prev => {
            if (!prev) return null;
            const newTools = prev.tools.includes(tool)
                ? prev.tools.filter(t => t !== tool)
                : [...prev.tools, tool];
            return { ...prev, tools: newTools };
        });
    };

    const handleSave = () => {
        if (!formData) return;
        const updatedAgents = agents.map(agent => agent.id === formData.id ? { ...formData, updatedAt: 'Just now' } : agent);
        setAgents(updatedAgents);
        setView('Agents');
    };
    
    const playPreview = async () => {
        if (loadingVoice || playingVoice) return;
        
        setLoadingVoice(true);
        setError(null);

        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const voicePrebuilt = voices.find(v => v.name === formData.voice)?.prebuilt || 'Kore';
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `This is a preview of the ${formData.voice} voice.` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voicePrebuilt } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.playbackRate.value = speakingRate;
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
            case 'Identity': return (
                <div className="space-y-6 max-w-md">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-eburon-muted mb-2">Display Name</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                    </div>
                    <div>
                        <label htmlFor="persona" className="block text-sm font-medium text-eburon-muted mb-2">Persona</label>
                        <textarea id="persona" name="persona" rows={5} value={formData.persona} onChange={handleInputChange} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none" placeholder="e.g., A friendly and helpful airline assistant."/>
                    </div>
                     <div>
                        <label htmlFor="language" className="block text-sm font-medium text-eburon-muted mb-2">Language</label>
                        <select id="language" name="language" value={formData.language} onChange={handleInputChange} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                            <option value="EN">English</option>
                            <option value="ES">Spanish</option>
                            <option value="FR">French</option>
                        </select>
                    </div>
                </div>
            );
            case 'Brain': return (
                 <div className="space-y-6 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Base Behavior</label>
                        <select className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                           <option>CSR Helpful (default)</option>
                           <option>Sales Focused</option>
                           <option>Technical Support</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Safety</label>
                         <div className="flex space-x-2">
                           {['Mild', 'Standard', 'Strict'].map(level => (
                               <button key={level} className={`flex-1 p-2 text-sm rounded-lg border-2 transition-colors ${level === 'Standard' ? 'border-brand-teal bg-brand-teal/10' : 'border-eburon-border hover:border-eburon-muted'}`}>{level}</button>
                           ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Tools</label>
                        <div className="space-y-2">
                            {ALL_TOOLS.map(tool => (
                                <button key={tool} onClick={() => handleToolToggle(tool)} className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-white/5">
                                    {formData.tools.includes(tool) ? <CheckSquare size={18} className="text-brand-teal"/> : <Square size={18} className="text-eburon-muted"/>}
                                    <span className={formData.tools.includes(tool) ? 'text-eburon-text' : 'text-eburon-muted'}>{tool}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
            case 'Voice': return (
                 <div className="space-y-6 max-w-sm">
                    {error && <p className="text-danger text-sm">{error}</p>}
                    <div>
                        <label htmlFor="voice" className="block text-sm font-medium text-eburon-muted mb-2">Voice</label>
                        <select id="voice" name="voice" value={formData.voice} onChange={handleInputChange} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                            {voices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Speaking Rate ({speakingRate.toFixed(1)}x)</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={speakingRate} onChange={e => setSpeakingRate(parseFloat(e.target.value))} className="w-full h-2 bg-eburon-border rounded-lg appearance-none cursor-pointer accent-brand-teal" />
                    </div>
                     <div className="flex items-center space-x-2 pt-2">
                         <button onClick={() => setBargeIn(!bargeIn)} className="flex items-center space-x-3 text-left">
                            {bargeIn ? <CheckSquare size={18} className="text-brand-teal"/> : <Square size={18} className="text-eburon-muted"/>}
                         </button>
                        <label htmlFor="barge-in" className="text-sm text-eburon-text">Allow barge-in (interruptions)</label>
                    </div>
                    <button onClick={playPreview} disabled={loadingVoice || playingVoice} className="flex items-center space-x-2 bg-eburon-border text-eburon-text font-semibold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loadingVoice ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
                        <span>{loadingVoice ? 'Generating...' : (playingVoice ? 'Playing...' : 'Preview')}</span>
                    </button>
                </div>
            );
             case 'Knowledge': return (
                 <div className="space-y-6 max-w-md">
                     <button className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                         <span>Attach Knowledge Base</span>
                     </button>
                     <div>
                         <label className="block text-sm font-medium text-eburon-muted mb-2">Attached</label>
                         <div className="flex flex-wrap gap-2">
                            {formData.tools.includes('Knowledge') ? (
                                <span className="bg-eburon-border text-eburon-text px-3 py-1 rounded-full text-sm">Airlines FAQ.pdf</span>
                            ) : (
                                <p className="text-sm text-eburon-muted">No knowledge base attached. Enable the 'Knowledge' tool in the Brain tab.</p>
                            )}
                         </div>
                     </div>
                 </div>
            );
            case 'Test': return (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-ok/10 text-ok">
                        <Phone size={48}/>
                    </div>
                    <h3 className="text-lg font-semibold">Test your agent</h3>
                    <p className="text-eburon-muted max-w-xs">Click the call button to start a live test session and interact with your agent in real-time.</p>
                    <button className="flex items-center justify-center space-x-2 bg-ok text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                        <Phone size={18} />
                        <span>Start Test Call</span>
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
                        <span className="text-eburon-muted font-normal">Editing:</span> {formData.name}
                    </h1>
                </div>
                <button onClick={handleSave} className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
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