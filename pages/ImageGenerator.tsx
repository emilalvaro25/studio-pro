import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../services/audioUtils';
import { useAppContext, createSystemPrompt } from '../App';
import { Play, Loader2, Save, User, Brain, Voicemail, Library, TestTube, Phone, CheckSquare, Square, Volume2, X, History, Server, Copy, Check } from 'lucide-react';
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

const ALL_TOOLS: AgentTool[] = ['Knowledge', 'Webhook', 'Calendar', 'Payments'];

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
            isActive ? 'bg-brand-teal/10 text-brand-teal' : 'text-eburon-muted hover:bg-white/5'
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
            <div className="bg-eburon-card border border-eburon-border rounded-xl p-6 w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Edit Full System Prompt</h2>
                    <button onClick={onClose}><X size={20} className="text-eburon-muted hover:text-eburon-text"/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <textarea 
                        value={currentPrompt}
                        onChange={e => setCurrentPrompt(e.target.value)}
                        className="w-full h-full bg-eburon-bg border border-eburon-border rounded-lg p-3 focus:ring-2 focus:ring-brand-teal focus:outline-none font-mono text-sm leading-relaxed"
                    />
                </div>
                <div className="mt-4 flex justify-end space-x-3 flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-eburon-border hover:bg-white/10">Cancel</button>
                    <button onClick={() => onSave(currentPrompt)} className="px-4 py-2 rounded-lg bg-brand-teal text-eburon-bg font-semibold hover:opacity-90">Save Prompt</button>
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
        <div className="bg-eburon-bg p-4 rounded-lg border border-eburon-border relative">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-eburon-muted">{title}</h4>
                <button onClick={copyToClipboard} className="text-eburon-muted hover:text-eburon-text flex items-center gap-1">
                    <Copy size={16} />
                    <span className="text-xs">Copy</span>
                </button>
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
    
    // Additional state for Brain and Telephony tabs
    const [baseBehavior, setBaseBehavior] = useState<'CSR Helpful (default)' | 'Sales Focused' | 'Technical Support'>('CSR Helpful (default)');
    const [safetyLevel, setSafetyLevel] = useState<'Mild' | 'Standard' | 'Strict'>('Standard');
    const [telephonyProvider, setTelephonyProvider] = useState<'Twilio' | 'Plivo' | null>('Twilio');


    useEffect(() => {
        if (selectedAgent) {
            // Ensure introSpiel exists for backward compatibility
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
        setFormData(prev => {
            if (!prev) return null;
            const updatedAgent = { ...prev, [name]: value };

            if (name === 'name' || name === 'voiceDescription') {
                 const companyMatch = prev.persona.match(/For a premium brand like (.*?),/);
                 // A bit of a hack to infer company name for prompt regen, but works for the dummy data structure
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
        // Here you would also save other states like baseBehavior, safetyLevel, etc.
        // For this example, we'll just focus on what's in formData
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
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) {
                throw new Error("Your browser does not support the Web Audio API, which is required for voice previews.");
            }

            if (!process.env.API_KEY) {
                throw new Error("Gemini API key not found. Please configure it in the settings.");
            }
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const textToSpeak = `Say it with this style: "${formData.voiceDescription}". Hello, you're listening to a preview of my voice. I can adjust my speaking speed if you'd like.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: prebuiltVoice } },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const outputAudioContext = new AudioContext({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.playbackRate.value = speakingRate;
                source.connect(outputAudioContext.destination);
                source.start();
                setPlayingVoice(voiceName);
                source.onended = () => {
                    setPlayingVoice(null);
                    outputAudioContext.close();
                };
            } else {
                throw new Error("The API did not return any audio data. Please try again.");
            }
        } catch (e) {
            console.error("Voice preview error:", e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during preview.";
            addNotification(errorMessage, 'error');
        } finally {
            setLoadingVoice(null);
        }
    };
    
    const getCompanyName = () => {
        // Simple logic to infer company name from agent name for placeholders
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
        if (type === 'Custom') {
            return customText || '';
        }
        return spielTemplates[type];
    };

    const handleSpielTypeChange = (type: IntroSpielType) => {
        setFormData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                introSpiel: {
                    ...prev.introSpiel,
                    type: type,
                    // If switching to custom and no text exists, start with a template
                    customText: (type === 'Custom' && !prev.introSpiel.customText) ? spielTemplates['Concise'] : prev.introSpiel.customText
                }
            };
        });
    };

    const handleCustomSpielChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setFormData(prev => {
            if (!prev || prev.introSpiel.type !== 'Custom') return prev;
            return {
                ...prev,
                introSpiel: { ...prev.introSpiel, customText: newText }
            };
        });
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
                        <label htmlFor="personaShortText" className="block text-sm font-medium text-eburon-muted mb-2">Persona (Short)</label>
                        <input id="personaShortText" name="personaShortText" type="text" value={formData.personaShortText} onChange={handleInputChange} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none" placeholder="e.g., A friendly and helpful airline assistant."/>
                        <button onClick={() => setIsPromptModalOpen(true)} className="text-sm text-brand-teal hover:underline mt-2">
                            Edit Full System Prompt
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Introduction Spiel</label>
                        <div className="space-y-2">
                            <div className="flex space-x-2">
                                {(['Concise', 'Warm', 'Custom'] as IntroSpielType[]).map(type => (
                                    <button 
                                        key={type} 
                                        onClick={() => handleSpielTypeChange(type)}
                                        className={`flex-1 p-2 text-sm rounded-lg border-2 transition-colors ${formData.introSpiel.type === type ? 'border-brand-teal bg-brand-teal/10' : 'border-eburon-border hover:border-eburon-muted'}`}
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
                                className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none font-mono text-xs disabled:opacity-70"
                            />
                        </div>
                    </div>
                     <div>
                        <label htmlFor="language" className="block text-sm font-medium text-eburon-muted mb-2">Language</label>
                        <select 
                            id="language" 
                            name="language" 
                            value={formData.language} 
                            onChange={handleInputChange} 
                            disabled 
                            className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <option value="Multilingual">Multilingual (Auto-Detect)</option>
                        </select>
                    </div>
                </div>
            );
            case 'Brain': return (
                 <div className="space-y-6 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Base Behavior</label>
                        <select value={baseBehavior} onChange={e => setBaseBehavior(e.target.value as any)} className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                           <option>CSR Helpful (default)</option>
                           <option>Sales Focused</option>
                           <option>Technical Support</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Safety</label>
                         <div className="flex space-x-2">
                           {(['Mild', 'Standard', 'Strict'] as typeof safetyLevel[]).map(level => (
                               <button key={level} onClick={() => setSafetyLevel(level)} className={`flex-1 p-2 text-sm rounded-lg border-2 transition-colors ${safetyLevel === level ? 'border-brand-teal bg-brand-teal/10' : 'border-eburon-border hover:border-eburon-muted'}`}>{level}</button>
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
                <div className="space-y-6 max-w-lg">
                     <div>
                        <label htmlFor="voiceDescription" className="block text-sm font-medium text-eburon-muted mb-2">Voice Description (Tone & Style)</label>
                        <textarea
                            id="voiceDescription"
                            name="voiceDescription"
                            rows={3}
                            value={formData.voiceDescription}
                            onChange={handleInputChange}
                            className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                            placeholder="e.g., A warm, empathetic voice with a slightly slower pace. Sounds reassuring and patient."
                        />
                        <p className="text-xs text-eburon-muted mt-1">This description will be embedded in the prompt to enhance the selected voice's tone.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Base Voice</label>
                        <div className="space-y-3">
                            {voices.map((voice) => (
                                <div 
                                    key={voice.name}
                                    onClick={() => handleVoiceSelection(voice.name)}
                                    className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                        formData.voice === voice.name 
                                        ? 'border-brand-teal bg-brand-teal/10' 
                                        : 'border-eburon-border hover:border-eburon-muted/50'
                                    }`}
                                >
                                    <div>
                                        <h4 className="font-medium text-eburon-text">{voice.name}</h4>
                                        <p className="text-xs text-eburon-muted">{voice.description}</p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            playPreview(voice.name, voice.prebuilt);
                                        }}
                                        disabled={!!loadingVoice || !!playingVoice}
                                        className="w-10 h-10 rounded-full bg-eburon-border hover:bg-brand-teal flex items-center justify-center transition-colors text-eburon-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Preview ${voice.name} voice`}
                                    >
                                        {loadingVoice === voice.name ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            playingVoice === voice.name ? <Volume2 size={20} className="text-brand-teal" /> : <Play size={20} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Speaking Rate ({speakingRate.toFixed(1)}x)</label>
                        <input type="range" min="0.5" max="1.5" step="0.1" value={speakingRate} onChange={e => setSpeakingRate(parseFloat(e.target.value))} className="w-full h-2 bg-eburon-border rounded-lg appearance-none cursor-pointer accent-brand-teal" />
                    </div>
                    <div className="flex items-center space-x-2 pt-2 cursor-help" title="Allows the user to interrupt the agent's speech.">
                         <button onClick={() => setBargeIn(!bargeIn)} className="flex items-center space-x-3 text-left">
                            {bargeIn ? <CheckSquare size={18} className="text-brand-teal"/> : <Square size={18} className="text-eburon-muted"/>}
                         </button>
                        <label htmlFor="barge-in" className="text-sm text-eburon-text">Allow barge-in (interruptions)</label>
                    </div>
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
                                <>
                                    <span className="bg-brand-teal/20 text-brand-teal px-3 py-1 rounded-full text-sm font-medium">Hyper-Realistic AI CSR KB.docx (Foundation)</span>
                                    <span className="bg-eburon-border text-eburon-text px-3 py-1 rounded-full text-sm">Airlines FAQ.pdf</span>
                                </>
                            ) : (
                                <p className="text-sm text-eburon-muted">Enable the 'Knowledge' tool in the Brain tab to attach the foundational KB.</p>
                            )}
                         </div>
                     </div>
                 </div>
            );
            case 'Telephony': return (
                 <div className="space-y-6 max-w-lg">
                    <div>
                        <h3 className="text-lg font-semibold text-eburon-text">Telephony Integration</h3>
                        <p className="text-sm text-eburon-muted">Connect your agent to a phone number to handle live calls.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Select Provider</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setTelephonyProvider('Twilio')}
                                className={`p-4 rounded-xl border-2 text-center transition-all ${
                                    telephonyProvider === 'Twilio'
                                    ? 'border-brand-teal bg-brand-teal/10'
                                    : 'border-eburon-border hover:border-eburon-muted/50'
                                }`}
                            >
                                <h4 className="font-semibold text-eburon-text">Twilio</h4>
                            </button>
                            <button
                                onClick={() => setTelephonyProvider('Plivo')}
                                className={`p-4 rounded-xl border-2 text-center transition-all ${
                                    telephonyProvider === 'Plivo'
                                    ? 'border-brand-teal bg-brand-teal/10'
                                    : 'border-eburon-border hover:border-eburon-muted/50'
                                }`}
                            >
                                <h4 className="font-semibold text-eburon-text">Plivo</h4>
                            </button>
                        </div>
                    </div>

                    {telephonyProvider === 'Twilio' && (
                        <div className="space-y-4 p-4 bg-eburon-bg rounded-lg border border-eburon-border">
                            <h4 className="font-semibold">Twilio Configuration</h4>
                            <div>
                                <label htmlFor="twilioSid" className="block text-xs font-medium text-eburon-muted mb-1">Account SID</label>
                                <input id="twilioSid" type="text" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                            <div>
                                <label htmlFor="twilioToken" className="block text-xs font-medium text-eburon-muted mb-1">Auth Token</label>
                                <input id="twilioToken" type="password" placeholder="••••••••••••••••••••••••••••" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                            <div>
                                <label htmlFor="twilioPhoneSid" className="block text-xs font-medium text-eburon-muted mb-1">Phone Number SID</label>
                                <input id="twilioPhoneSid" type="text" placeholder="PNxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                        </div>
                    )}
                    
                    {telephonyProvider === 'Plivo' && (
                        <div className="space-y-4 p-4 bg-eburon-bg rounded-lg border border-eburon-border">
                            <h4 className="font-semibold">Plivo Configuration</h4>
                            <div>
                                <label htmlFor="plivoAuthId" className="block text-xs font-medium text-eburon-muted mb-1">Auth ID</label>
                                <input id="plivoAuthId" type="text" placeholder="MAxxxxxxxxxxxxxxxxxx" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                            <div>
                                <label htmlFor="plivoToken" className="block text-xs font-medium text-eburon-muted mb-1">Auth Token</label>
                                <input id="plivoToken" type="password" placeholder="••••••••••••••••••••••••••••" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                            <div>
                                <label htmlFor="plivoAppId" className="block text-xs font-medium text-eburon-muted mb-1">Application ID</label>
                                <input id="plivoAppId" type="text" placeholder="123456789012345678" className="w-full bg-eburon-border/50 border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"/>
                            </div>
                        </div>
                    )}
                    <div className="pt-6 mt-6 border-t border-eburon-border space-y-4">
                        <h3 className="text-lg font-semibold text-eburon-text">Deployment Instructions</h3>
                        <p className="text-sm text-eburon-muted">
                            To connect your live number, you need a backend service to handle the WebSocket connection.
                            Use the code below in your provider's console.
                        </p>

                        {telephonyProvider === 'Twilio' && (
                            <div>
                                <CodeSnippet
                                    title="Twilio: TwiML Bin Content"
                                    language="xml"
                                    content={`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>Connecting you to the agent. Please wait a moment.</Say>
    <Connect>
        <Stream url="wss://your-backend-service.com/ws/${formData.id}" />
    </Connect>
</Response>`}
                                />
                                <p className="text-xs text-eburon-muted mt-2">
                                    <strong>Note:</strong> Replace <code>wss://your-backend-service.com</code> with your actual backend's WebSocket URL. Your backend is responsible for handling the audio stream and call recording.
                                </p>
                            </div>
                        )}

                        {telephonyProvider === 'Plivo' && (
                            <div>
                                <CodeSnippet
                                    title="Plivo: XML Application Content"
                                    language="xml"
                                    content={`<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Speak>Connecting you to the agent. Please wait a moment.</Speak>
    <Connect action="wss://your-backend-service.com/ws/${formData.id}" method="GET" />
</Response>`}
                                />
                                <p className="text-xs text-eburon-muted mt-2">
                                    <strong>Note:</strong> Replace <code>wss://your-backend-service.com</code> with your actual backend's WebSocket URL. Your backend is responsible for handling the audio stream and call recording.
                                </p>
                            </div>
                        )}
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
                    <button onClick={() => handleStartTest(formData)} className="flex items-center justify-center space-x-2 bg-ok text-white font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity">
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
        { id: 'Telephony', icon: <Server size={18} />, label: 'Telephony' },
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
                <div className="flex items-center space-x-3">
                    <button onClick={() => setVersioningAgent({ agent: selectedAgent, builderState: formData })} className="flex items-center space-x-2 bg-eburon-border text-eburon-text font-semibold px-4 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <History size={18} />
                        <span>Version History</span>
                    </button>
                    <button onClick={handleSave} className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                        <Save size={18} />
                        <span>Save</span>
                    </button>
                </div>
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