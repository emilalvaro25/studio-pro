import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../services/audioUtils';
import { useAppContext, createSystemPrompt } from '../App';
import Tooltip from '../components/Tooltip';
import { Play, Loader2, Save, User, Brain, Voicemail, Library, TestTube, Phone, CheckSquare, Square, Volume2, X, History, Server, Copy, Check, Download, Upload, Users, PlayCircle, PauseCircle, StopCircle } from 'lucide-react';
import { Agent, AgentTool, IntroSpielType } from '../types';

const voices = [
    { name: 'Amber', prebuilt: 'Kore', description: 'Warm, organic, and inviting.' },
    { name: 'Onyx', prebuilt: 'Puck', description: 'Deep, clear, and authoritative.' },
    { name: 'Citrine', prebuilt: 'Zephyr', description: 'Bright, energetic, and positive.' },
    { name: 'Jade', prebuilt: 'Charon', description: 'Serene, smooth, and narrative.' },
    { name: 'Peridot', prebuilt: 'Fenrir', description: 'A pleasant and approachable tone.' },
    { name: 'Diamond', prebuilt: 'Aoede', description: 'Clear, brilliant, and sophisticated.' },
    { name: 'Orion', prebuilt: 'Orion', description: 'A calm, professional, and trustworthy voice.' },
    { name: 'Lyra', prebuilt: 'Lyra', description: 'A youthful and energetic female voice.' },
    { name: 'Calypso', prebuilt: 'Calypso', description: 'A mature and reassuring female voice.' },
    { name: 'Helios', prebuilt: 'Helios', description: 'A mature and authoritative male voice.' },
    { name: 'Echo', prebuilt: 'Echo', description: 'A neutral, standard male voice.' },
    { name: 'Aura', prebuilt: 'Aura', description: 'A neutral, standard female voice.' },
];

const ALL_TOOLS: AgentTool[] = ['Knowledge', 'Webhook', 'Calendar', 'Payments', 'Salesforce Lookup', 'HubSpot Update'];

type BuilderTab = 'Identity' | 'Brain' | 'Voice' | 'Knowledge' | 'Telephony' | 'Test';

const TabButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}> = ({ isActive, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-subtle hover:bg-panel'
        }`}
    >
        {icon}
        <span className="font-medium">{label}</span>
    </button>
);

const SystemPromptModal: React.FC<{ prompt: string; onSave: (newPrompt: string) => void; onClose: () => void; }> = ({ prompt, onSave, onClose }) => {
    const [currentPrompt, setCurrentPrompt] = useState(prompt);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Edit Full System Prompt</h2>
                    <button onClick={onClose}><X size={20} className="text-subtle hover:text-text"/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <textarea 
                        value={currentPrompt}
                        onChange={e => setCurrentPrompt(e.target.value)}
                        className="w-full h-full bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-sm leading-relaxed"
                    />
                </div>
                <div className="mt-4 flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-panel hover:bg-border">Cancel</button>
                    <button onClick={() => onSave(currentPrompt)} className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90">Save Prompt</button>
                </div>
            </div>
        </div>
    );
};

const CodeSnippet: React.FC<{ title: string; content: string; language: string; }> = ({ title, content, language }) => {
    const { addNotification } = useAppContext();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        addNotification('Copied to clipboard!', 'success');
    };

    return (
        <div className="bg-background p-4 rounded-lg border border-border relative">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-subtle">{title}</h4>
                <Tooltip text="Copy code">
                    <button onClick={copyToClipboard} className="text-subtle hover:text-text flex items-center gap-1">
                        <Copy size={16} />
                    </button>
                </Tooltip>
            </div>
            <pre className="text-xs text-brand-gold break-all bg-black/20 p-2 rounded-md overflow-x-auto">
                <code className={`language-${language}`}>{content}</code>
            </pre>
        </div>
    );
};


const AgentBuilderPage: React.FC = () => {
    const { selectedAgent, setView, updateAgent, handleStartTest, setVersioningAgent, addNotification } = useAppContext();
    const [activeTab, setActiveTab] = useState<BuilderTab>('Identity');
    
    const [formData, setFormData] = useState<Agent | null>(null);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
    
    const [speakingRate, setSpeakingRate] = useState(1.0);
    const [bargeIn, setBargeIn] = useState(true);
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
    
    const [baseBehavior, setBaseBehavior] = useState<'CSR Helpful (default)' | 'Sales Focused' | 'Technical Support'>('CSR Helpful (default)');
    const [safetyLevel, setSafetyLevel] = useState<'Mild' | 'Standard' | 'Strict'>('Standard');
    const [telephonyProvider, setTelephonyProvider] = useState<'Twilio' | 'Plivo' | null>('Twilio');
    const [campaignContacts, setCampaignContacts] = useState<any[]>([]);
    const [campaignStatus, setCampaignStatus] = useState<'idle' | 'running' | 'paused' | 'finished'>('idle');


    useEffect(() => {
        if (selectedAgent) {
            const agentWithDefaults = {
                ...selectedAgent,
                introSpiel: selectedAgent.introSpiel || { type: 'Concise', customText: '' }
            };
            setFormData(agentWithDefaults);
        } else {
            setFormData(null);
        }
    }, [selectedAgent]);


    if (!selectedAgent || !formData) {
        return (
            <div className="p-6 text-center text-subtle h-full flex flex-col items-center justify-center">
                <p className="text-lg">No agent selected.</p>
                <p>Please select an agent from the list to begin editing.</p>
                <button onClick={() => setView('Agents')} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                    Go to Agents
                </button>
            </div>
        );
    }
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (!prev) return null;
            const updatedAgent = { ...prev, [name]: value };

            if (name === 'name' || name === 'voiceDescription') {
                 const companyMatch = prev.persona.match(/For a premium brand like (.*?),/);
                 const companyName = companyMatch ? companyMatch[1] : (updatedAgent.name.includes("Airlines") ? "Global Airlines" : "the company");
                 updatedAgent.persona = createSystemPrompt(updatedAgent.name, companyName, updatedAgent.voiceDescription);
            }
            return updatedAgent;
        });
    };

    const handleVoiceSelection = (voiceName: string) => {
        setFormData(prev => prev ? { ...prev, voice: voiceName } : null);
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

    const handleSave = async () => {
        if (!formData) return;
        const success = await updateAgent({ ...formData, updatedAt: 'Just now' });
        if(success) {
            addNotification(`${formData.name} saved successfully!`, 'success');
        }
    };

    const handleSavePrompt = (newPrompt: string) => {
        setFormData(prev => prev ? { ...prev, persona: newPrompt } : null);
        setIsPromptModalOpen(false);
    };
    
    const playPreview = async (voiceName: string, prebuiltVoice: string) => {
        if (loadingVoice || playingVoice || !formData) return;
        setLoadingVoice(voiceName);
        try {
            if (!process.env.API_KEY) throw new Error("API_KEY not set.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const textToSpeak = `Say it with this style: "${formData.voiceDescription}". Hello, you're listening to a preview of my voice. I can adjust my speaking speed if you'd like.`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: prebuiltVoice } } },
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
                setPlayingVoice(voiceName);
                source.onended = () => { setPlayingVoice(null); outputAudioContext.close(); };
            } else { throw new Error("API did not return audio data."); }
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            addNotification(errorMessage, 'error');
        } finally { setLoadingVoice(null); }
    };
    
    const getCompanyName = () => {
        if (formData.name.toLowerCase().includes('turkish airlines')) return 'Turkish Airlines';
        if (formData.name.toLowerCase().includes('bank')) return 'Global Bank';
        return 'the company';
    }

    const spielTemplates: Record<Exclude<IntroSpielType, 'Custom'>, string> = {
        'Concise': `Thank you for calling ${getCompanyName()}. You're speaking with ${formData.name}. How may I assist you?`,
        'Warm': `Hello, and thank you for calling ${getCompanyName()}. My name is ${formData.name}, and I'm here to help. How are you today?`
    };

    const getSpielText = (): string => {
        if (!formData.introSpiel) return '';
        const { type, customText } = formData.introSpiel;
        return type === 'Custom' ? (customText || '') : spielTemplates[type];
    };

    const handleSpielTypeChange = (type: IntroSpielType) => {
        setFormData(prev => prev ? { ...prev, introSpiel: { ...prev.introSpiel, type: type, customText: (type === 'Custom' && !prev.introSpiel.customText) ? spielTemplates['Concise'] : prev.introSpiel.customText } } : null);
    };

    const handleCustomSpielChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setFormData(prev => (prev && prev.introSpiel.type === 'Custom') ? { ...prev, introSpiel: { ...prev.introSpiel, customText: newText } } : prev);
    };

    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                const headers = lines[0].split(',').map(h => h.trim());
                const contacts = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    return headers.reduce((obj, header, index) => ({ ...obj, [header]: values[index], status: 'Pending', result: '' }), {});
                });
                setCampaignContacts(contacts);
                addNotification(`${contacts.length} contacts loaded for campaign.`, 'success');
            };
            reader.readAsText(file);
        }
    };
    
    const downloadCsvTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8," + "phone_number,first_name,last_name,account_id\n+15551234567,John,Doe,JD123\n+15557654321,Jane,Smith,JS456";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "campaign_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const renderContent = () => {
        switch(activeTab) {
            case 'Identity': return (
                <div className="space-y-6 max-w-md">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-subtle mb-2">Display Name</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none"/>
                    </div>
                    <div>
                        <label htmlFor="personaShortText" className="block text-sm font-medium text-subtle mb-2">Persona (Short)</label>
                        <input id="personaShortText" name="personaShortText" type="text" value={formData.personaShortText} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g., A friendly and helpful airline assistant."/>
                        <button onClick={() => setIsPromptModalOpen(true)} className="text-sm text-primary hover:underline mt-2">
                            Edit Full System Prompt
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-subtle mb-2">Introduction Spiel</label>
                        <div className="space-y-2">
                            <div className="flex space-x-2">
                                {(['Concise', 'Warm', 'Custom'] as IntroSpielType[]).map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => handleSpielTypeChange(type)}
                                        className={`flex-1 p-2 text-sm rounded-lg border-2 transition-colors ${formData.introSpiel.type === type ? 'border-primary bg-primary/10' : 'border-border hover:border-subtle'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={getSpielText()}
                                onChange={handleCustomSpielChange}
                                disabled={formData.introSpiel.type !== 'Custom'}
                                rows={3}
                                className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none font-mono text-xs disabled:opacity-70"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="language" className="block text-sm font-medium text-subtle mb-2">Language</label>
                        <select id="language" name="language" value={formData.language} onChange={handleInputChange} disabled className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed">
                            <option value="Multilingual">Multilingual (Auto-Detect)</option>
                        </select>
                    </div>
                </div>
            );
            case 'Brain': return (
                 <div className="space-y-6 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-subtle mb-2">Base Behavior</label>
                        <select value={baseBehavior} onChange={e => setBaseBehavior(e.target.value as any)} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none">
                           <option>CSR Helpful (default)</option>
                           <option>Sales Focused</option>
                           <option>Technical Support</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-subtle mb-2">Safety</label>
                         <div className="flex space-x-2">
                           {(['Mild', 'Standard', 'Strict'] as typeof safetyLevel[]).map(level => (
                               <button key={level} onClick={() => setSafetyLevel(level)} className={`flex-1 p-2 text-sm rounded-lg border-2 transition-colors ${safetyLevel === level ? 'border-primary bg-primary/10' : 'border-border hover:border-subtle'}`}>{level}</button>
                           ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-subtle mb-2">General Tools</h4>
                        <div className="space-y-2">
                            {ALL_TOOLS.filter(t => !t.includes(' ')).map(tool => (
                                <button key={tool} onClick={() => handleToolToggle(tool)} className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-panel">
                                    {formData.tools.includes(tool) ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-subtle"/>}
                                    <span className={formData.tools.includes(tool) ? 'text-text' : 'text-subtle'}>{tool}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h4 className="text-sm font-medium text-subtle mb-2">CRM Tools</h4>
                        <div className="space-y-2">
                            {ALL_TOOLS.filter(t => t.includes(' ')).map(tool => (
                                <button key={tool} onClick={() => handleToolToggle(tool)} className="flex items-center space-x-3 w-full text-left p-2 rounded-lg hover:bg-panel">
                                    {formData.tools.includes(tool) ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-subtle"/>}
                                    <span className={formData.tools.includes(tool) ? 'text-text' : 'text-subtle'}>{tool}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            );
            case 'Voice': return (
                <div className="space-y-6 max-w-lg">
                     <div>
                        <label htmlFor="voiceDescription" className="block text-sm font-medium text-subtle mb-2">Voice Description (Tone & Style)</label>
                        <textarea id="voiceDescription" name="voiceDescription" rows={3} value={formData.voiceDescription} onChange={handleInputChange} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none" placeholder="e.g., A warm, empathetic voice with a slightly slower pace."/>
                        <p className="text-xs text-subtle mt-1">This description will be embedded in the prompt to enhance the selected voice's tone.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-subtle mb-2">Base Voice</label>
                        <div className="space-y-3">
                            {voices.map((voice) => (
                                <div key={voice.name} onClick={() => handleVoiceSelection(voice.name)} className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.voice === voice.name ? 'border-primary bg-primary/10' : 'border-border hover:border-subtle/50'}`}>
                                    <div>
                                        <h4 className="font-medium text-text">{voice.name}</h4>
                                        <p className="text-xs text-subtle">{voice.description}</p>
                                    </div>
                                    <Tooltip text={`Preview ${voice.name} voice`}>
                                        <button onClick={(e) => { e.stopPropagation(); playPreview(voice.name, voice.prebuilt); }} disabled={!!loadingVoice || !!playingVoice} className="w-10 h-10 rounded-full bg-panel hover:bg-primary flex items-center justify-center transition-colors text-subtle hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" aria-label={`Preview ${voice.name} voice`}>
                                            {loadingVoice === voice.name ? <Loader2 size={20} className="animate-spin" /> : (playingVoice === voice.name ? <Volume2 size={20} className="text-primary" /> : <Play size={20} />)}
                                        </button>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-subtle mb-2">Speaking Rate ({speakingRate.toFixed(1)}x)</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={speakingRate} onChange={e => setSpeakingRate(parseFloat(e.target.value))} className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary" />
                    </div>
                    <div className="flex items-center space-x-3 pt-2">
                        <button onClick={() => setBargeIn(!bargeIn)} className="flex items-center space-x-3 text-left">
                            {bargeIn ? <CheckSquare size={18} className="text-primary"/> : <Square size={18} className="text-subtle"/>}
                        </button>
                        <Tooltip text="Allows the user to interrupt the agent's speech.">
                            <label htmlFor="barge-in" className="text-sm text-text cursor-pointer">Allow barge-in (interruptions)</label>
                        </Tooltip>
                    </div>
                </div>
            );
             case 'Knowledge': return (
                 <div className="space-y-6 max-w-md">
                     <button className="flex items-center space-x-2 bg-primary text-white font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                         <span>Attach Knowledge Base</span>
                     </button>
                     <div>
                         <label className="block text-sm font-medium text-subtle mb-2">Attached</label>
                         <div className="flex flex-wrap gap-2">
                            {formData.tools.includes('Knowledge') ? (
                                <>
                                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">Hyper-Realistic AI CSR KB.docx (Foundation)</span>
                                    <span className="bg-panel text-text px-3 py-1 rounded-full text-sm">Airlines FAQ.pdf</span>
                                </>
                            ) : (
                                <p className="text-sm text-subtle">Enable the 'Knowledge' tool in the Brain tab to attach the foundational KB.</p>
                            )}
                         </div>
                     </div>
                 </div>
            );
            case 'Telephony': return (
                 <div className="space-y-8 max-w-lg">
                    <div className="p-6 bg-surface border border-border rounded-xl">
                        <h3 className="text-lg font-semibold text-text">Inbound Calls</h3>
                        <p className="text-sm text-subtle mb-4">Connect your agent to a phone number to handle live calls.</p>
                        <div className="space-y-4">
                           <div>
                                <label className="block text-sm font-medium text-subtle mb-2">Select Provider</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setTelephonyProvider('Twilio')} className={`p-4 rounded-xl border-2 text-center transition-all ${telephonyProvider === 'Twilio' ? 'border-primary bg-primary/10' : 'border-border hover:border-subtle/50'}`}><h4 className="font-semibold text-text">Twilio</h4></button>
                                    <button onClick={() => setTelephonyProvider('Plivo')} className={`p-4 rounded-xl border-2 text-center transition-all ${telephonyProvider === 'Plivo' ? 'border-primary bg-primary/10' : 'border-border hover:border-subtle/50'}`}><h4 className="font-semibold text-text">Plivo</h4></button>
                                </div>
                            </div>
                            {telephonyProvider && (
                                <CodeSnippet title={`${telephonyProvider} Stream URL`} language="text" content={`wss://your-backend.com/ws/${formData.id}`} />
                            )}
                        </div>
                    </div>

                    <div className="p-6 bg-surface border border-border rounded-xl">
                        <h3 className="text-lg font-semibold text-text">Outbound Campaign</h3>
                        <p className="text-sm text-subtle mb-4">Upload a list of contacts to initiate an automated outbound calling campaign.</p>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label htmlFor="csv-upload" className="flex items-center justify-center space-x-2 bg-panel hover:bg-border text-text font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer">
                                    <Upload size={16} />
                                    <span>Upload CSV</span>
                                </label>
                                <input id="csv-upload" type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                                <button onClick={downloadCsvTemplate} className="flex items-center justify-center space-x-2 bg-panel hover:bg-border text-text font-semibold px-4 py-2 rounded-lg transition-colors">
                                    <Download size={16} />
                                    <span>Download Template</span>
                                </button>
                            </div>
                            {campaignContacts.length > 0 && (
                                <div className="space-y-4">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2 text-subtle">
                                            <Users size={16} />
                                            <span>{campaignContacts.length} contacts loaded</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Tooltip text={campaignStatus === 'running' ? 'Pause Campaign' : 'Start Campaign'}>
                                                <button onClick={() => setCampaignStatus(s => s === 'running' ? 'paused' : 'running')} className="p-2 text-ok rounded-full hover:bg-ok/10 disabled:opacity-50" disabled={campaignStatus === 'finished'}>
                                                    {campaignStatus === 'running' ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="Stop Campaign">
                                                <button onClick={() => setCampaignStatus('finished')} className="p-2 text-danger rounded-full hover:bg-danger/10 disabled:opacity-50" disabled={campaignStatus === 'idle' || campaignStatus === 'finished'}>
                                                    <StopCircle size={20} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto bg-background p-2 rounded-lg border border-border">
                                        <table className="w-full text-left text-sm">
                                            <thead><tr className="text-xs text-subtle"><th className="p-2">Phone</th><th className="p-2">Name</th><th className="p-2">Status</th></tr></thead>
                                            <tbody>{campaignContacts.map((c, i) => <tr key={i} className="border-t border-border"><td className="p-2">{c.phone_number}</td><td className="p-2">{c.first_name} {c.last_name}</td><td className="p-2">{c.status}</td></tr>)}</tbody>
                                        </table>
                                    </div>
                                </div>
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
                    <p className="text-subtle max-w-xs">Click the call button to start a live test session and interact with your agent in real-time.</p>
                    <button onClick={() => handleStartTest(formData)} className="flex items-center justify-center space-x-2 bg-ok text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
                        <Phone size={18} />
                        <span>Start Test Call</span>
                    </button>
                </div>
            );
            default: return <div className="text-subtle">Configuration for {activeTab} will be here.</div>
        }
    };

    const tabs: {id: BuilderTab, icon: React.ReactNode, label: string}[] = [
        { id: 'Identity', icon: <User size={18} />, label: 'Identity' },
        { id: 'Brain', icon: <Brain size={18} />, label: 'Brain' },
        { id: 'Voice', icon: <Voicemail size={18} />, label: 'Voice' },
        { id: 'Knowledge', icon: <Library size={18} />, label: 'Knowledge' },
        { id: 'Telephony', icon: <Server size={18} />, label: 'Telephony' },
        { id: 'Test', icon: <TestTube size={18} />, label: 'Test' },
    ];

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <button onClick={() => setView('Agents')} className="text-sm text-subtle hover:text-text mb-1">&larr; Back to Agents</button>
                    <h1 className="text-xl font-semibold text-text">
                        <span className="text-subtle font-normal">Editing:</span> {formData.name}
                    </h1>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={() => setVersioningAgent({ agent: selectedAgent, builderState: formData })} className="flex items-center space-x-2 bg-panel text-text font-semibold px-4 py-1.5 rounded-lg hover:bg-border transition-colors">
                        <History size={18} />
                        <span>Version History</span>
                    </button>
                    <button onClick={handleSave} className="flex items-center space-x-2 bg-primary text-white font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                        <Save size={18} />
                        <span>Save</span>
                    </button>
                </div>
            </div>
            <div className="bg-surface border border-border rounded-xl flex-1 flex flex-col">
                <div className="p-2 border-b border-border flex items-center space-x-2 overflow-x-auto">
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
             {isPromptModalOpen && (
                <SystemPromptModal
                    prompt={formData.persona}
                    onSave={handleSavePrompt}
                    onClose={() => setIsPromptModalOpen(false)}
                />
            )}
        </div>
    );
};

export default AgentBuilderPage;