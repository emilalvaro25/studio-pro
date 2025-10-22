import React, { useState } from 'react';
import { Plus, Play, Loader2 } from 'lucide-react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../services/audioUtils';
import { useAppContext } from '../App';

const voices = [
    { name: 'Amber', style: 'Warm, organic, and inviting', prebuilt: 'Kore' },
    { name: 'Onyx', style: 'Deep, clear, and authoritative', prebuilt: 'Puck' },
    { name: 'Citrine', style: 'Bright, energetic, and positive', prebuilt: 'Zephyr' },
    { name: 'Jade', style: 'Serene, smooth, and narrative', prebuilt: 'Charon' },
    { name: 'Peridot', style: 'A pleasant and approachable tone', prebuilt: 'Fenrir' },
    { name: 'Diamond', style: 'Clear, brilliant, and sophisticated', prebuilt: 'Aoede' },
];

const VoicesPage: React.FC = () => {
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);
    const [loadingVoice, setLoadingVoice] = useState<string | null>(null);
    const { addNotification } = useAppContext();

    const playPreview = async (voiceName: string, prebuiltVoice: string) => {
        if (loadingVoice || playingVoice) return;
        
        setLoadingVoice(voiceName);

        try {
            if (!process.env.API_KEY) {
                throw new Error("API_KEY not set.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Hello, this is the ${voiceName} voice.` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: prebuiltVoice },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                // Fix: Use `(window as any).webkitAudioContext` for TypeScript compatibility.
                const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputAudioContext.destination);
                source.start();
                setPlayingVoice(voiceName);
                source.onended = () => setPlayingVoice(null);
            } else {
                throw new Error("API did not return audio data.");
            }
        } catch (error) {
            console.error("Error generating speech:", error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            addNotification(`Failed to play voice preview: ${message}`, 'error');
        } finally {
            setLoadingVoice(null);
        }
    };
    

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-semibold text-eburon-text">Voices</h1>
                <button className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    <Plus size={18} />
                    <span>Add Voice</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {voices.map(voice => (
                    <div key={voice.name} className="bg-eburon-card border border-eburon-border rounded-xl p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-eburon-text">{voice.name}</h3>
                            <p className="text-eburon-muted text-xs">{voice.style}</p>
                        </div>
                        <button 
                            onClick={() => playPreview(voice.name, voice.prebuilt)}
                            disabled={!!loadingVoice || !!playingVoice}
                            className="w-10 h-10 rounded-full bg-eburon-border hover:bg-brand-teal flex items-center justify-center transition-colors text-eburon-muted hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                            {loadingVoice === voice.name ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VoicesPage;