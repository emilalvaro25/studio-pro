import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../services/audioUtils';
import { useAppContext } from '../App';
import { CallRecord, TranscriptLine } from '../types';
import { getDepartmentalPrompt, Department } from '../App';
import { 
    Bot, User, PhoneIncoming, Clock, FileText, Phone, PhoneOff, Mic, MicOff, Volume2, 
    Delete, Circle, Pause, Play as PlayIcon, ArrowLeft, Search 
} from 'lucide-react';

// --- Constants and Helpers ---
const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const DTMF: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

const SOUND_SOURCES = {
    HOLD_MUSIC: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1811b37ac8.mp3',
    RING_TONE: 'https://cdn.pixabay.com/audio/2022/04/18/audio_517905d21a.mp3',
    FAIL_TONE: 'https://cdn.pixabay.com/audio/2022/08/03/audio_533130d7b7.mp3',
    BG_AMBIENCE: 'https://cdn.pixabay.com/audio/2022/09/23/audio_7b80d603a1.mp3'
};

const DialerButton: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void, 'data-id'?: string; disabled?: boolean }> = ({ children, className, onClick, 'data-id': dataId, disabled }) => (
    <button onClick={onClick} data-id={dataId} disabled={disabled} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

const DialpadKey: React.FC<{ digit: string; subtext?: string; onClick: (digit: string) => void }> = ({ digit, subtext, onClick }) => (
    <button onClick={() => onClick(digit)} className="rounded-full w-16 h-16 flex flex-col items-center justify-center bg-panel hover:bg-border transition-colors focus:outline-none focus:ring-2 focus:ring-primary">
        <span className="text-2xl font-light">{digit}</span>
        {subtext && <span className="text-xs text-muted -mt-1">{subtext}</span>}
    </button>
);

const drawVisualizer = (
    analyser: AnalyserNode,
    canvasCtx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    color: string
) => {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    const numBars = 64;
    const barWidth = canvas.width / numBars;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.1, color);
    gradient.addColorStop(0.6, `${color}A0`);
    gradient.addColorStop(1, `${color}30`);
    canvasCtx.fillStyle = gradient;
    
    const step = Math.floor(bufferLength / numBars);

    for (let i = 0; i < numBars; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j];
        }
        const avg = step > 0 ? sum / step : dataArray[i];
        const barHeight = Math.pow(avg / 255.0, 2.2) * canvas.height;
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        if (barHeight > 0) {
            canvasCtx.fillRect(x, y, barWidth - 1, barHeight);
        }
    }
};

const VOICE_MAP: { [key: string]: string } = {
    'Amber': 'Kore', 'Onyx': 'Puck', 'Citrine': 'Zephyr', 'Jade': 'Charon',
    'Peridot': 'Fenrir', 'Diamond': 'Aoede'
};

type IvrState = 'idle' | 'ringing' | 'language_select' | 'main_menu' | 'routing' | 'connected_to_agent' | 'ended';

const IVR_CONFIG = {
    language_select: {
        prompt: (agentName: string) => `Thank you for calling ${agentName.split(' ')[0]}. For English, press 1. Para Español, oprima el número dos.`,
        timeout: 7000,
        handleKeyPress: (key: string): { nextState: IvrState, department?: Department } | null => {
            if (key === '1' || key === '2') return { nextState: 'main_menu' };
            return null;
        }
    },
    main_menu: {
        prompt: () => `For new bookings, press 1. For cancellations or refunds, press 2. For complaints, press 3. For special assistance, press 4. For all other inquiries, press 5. To speak with a representative, press 0.`,
        timeout: 10000,
        handleKeyPress: (key: string): { nextState: IvrState, department?: Department } | null => {
            const keyMap: { [key: string]: Department } = {
                '1': 'Booking', '2': 'Refunds', '3': 'Complaints', '4': 'Special Needs', '5': 'Other', '0': 'General',
            };
            const department = keyMap[key];
            if (department) return { nextState: 'routing', department };
            return null;
        }
    }
};

const HistoryTranscriptView: React.FC<{
    transcript: TranscriptLine[];
    startTime: number;
    playbackTime: number; // in ms
}> = ({ transcript, startTime, playbackTime }) => (
    <div aria-live="polite" className="flex-1 space-y-4 overflow-y-auto pr-2 bg-background p-4 rounded-lg">
        {transcript.map((line, i) => {
            const relativeTime = line.timestamp - startTime;
            const displayTime = Math.max(0, relativeTime);
            
            const minutes = Math.floor(displayTime / 60000).toString().padStart(2, '0');
            const seconds = Math.floor((displayTime % 60000) / 1000).toString().padStart(2, '0');
            const timestampStr = `${minutes}:${seconds}`;

            const nextLineTime = i < transcript.length - 1 && transcript[i+1].speaker !== 'System'
                ? transcript[i+1].timestamp - startTime 
                : Infinity;
            
            const isActive = line.speaker !== 'System' && playbackTime >= displayTime && playbackTime < nextLineTime;

            return (
                <div key={i} className={`flex items-start gap-3 ${line.speaker === 'You' ? 'justify-end' : ''}`}>
                    {line.speaker === 'Agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center"><Bot size={18} /></div>}
                    
                    <div className="flex flex-col">
                        <div className={`p-3 rounded-lg max-w-lg transition-colors duration-200 ${
                            line.speaker === 'System' ? 'text-center w-full bg-transparent text-subtle text-xs' :
                            line.speaker === 'You' ? (isActive ? 'bg-primary/20' : 'bg-panel') :
                            (isActive ? 'bg-brand-teal/20' : 'bg-surface border border-border')
                        }`}>
                            <p>{line.text}</p>
                        </div>
                        {line.speaker !== 'System' && (
                            <span className={`text-xs text-muted mt-1 ${line.speaker === 'You' ? 'text-right' : 'text-left'}`}>
                                {timestampStr}
                            </span>
                        )}
                    </div>
                    
                    {line.speaker === 'You' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-panel flex items-center justify-center"><User size={18} /></div>}
                </div>
            );
        })}
    </div>
);

const CallHistoryPage: React.FC = () => {
    // --- Combined State ---
    const { 
        callHistory, selectedAgent, addCallToHistory, addNotification, supabase, isDemoMode, 
        startInSimulationMode, setStartInSimulationMode 
    } = useAppContext();
    const [isSimulating, setIsSimulating] = useState(startInSimulationMode);
    
    // --- History View State ---
    const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [playbackTime, setPlaybackTime] = useState(0); // in ms
    const audioRef = useRef<HTMLAudioElement>(null);

    // --- Simulation View State ---
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
    const [ivrState, setIvrState] = useState<IvrState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState<TranscriptLine[]>([]);
    const [dialedNumber, setDialedNumber] = useState('');
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [isBgSoundActive, setIsBgSoundActive] = useState(false);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    
    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const liveTranscriptRef = useRef(liveTranscript);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const ivrTimeoutRef = useRef<number | null>(null);
    const callStatusRef = useRef(callStatus);
    const inputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const outputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // --- Unified Audio Engine Refs ---
    const ringToneBufferRef = useRef<AudioBuffer | null>(null);
    const failToneBufferRef = useRef<AudioBuffer | null>(null);
    const holdMusicBufferRef = useRef<AudioBuffer | null>(null);
    const bgAmbienceBufferRef = useRef<AudioBuffer | null>(null);

    const ringToneSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const holdMusicSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const bgAmbienceSourceRef = useRef<AudioBufferSourceNode | null>(null);
    
    // --- History Logic ---
    useEffect(() => {
        if (startInSimulationMode) {
            setIsSimulating(true);
            setStartInSimulationMode(false); // Reset the flag
        }
    }, [startInSimulationMode, setStartInSimulationMode]);

    const sortedAndFilteredHistory = useMemo(() => {
        return [...callHistory]
            .sort((a, b) => b.startTime - a.startTime)
            .filter(call => call.agentName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [callHistory, searchTerm]);
    
    useEffect(() => {
        if (!isSimulating && sortedAndFilteredHistory.length > 0) {
            const isSelectedCallVisible = sortedAndFilteredHistory.some(call => call.id === selectedCall?.id);
            if (!selectedCall || !isSelectedCallVisible) {
                setSelectedCall(sortedAndFilteredHistory[0]);
            }
        } else if (!isSimulating) {
            setSelectedCall(null);
        }
    }, [sortedAndFilteredHistory, selectedCall, isSimulating]);
    
    useEffect(() => {
        setPlaybackTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    }, [selectedCall]);

    // --- Simulation Logic ---
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { liveTranscriptRef.current = liveTranscript; }, [liveTranscript]);

    const addLiveTranscript = useCallback((line: Omit<TranscriptLine, 'timestamp'>) => {
        setLiveTranscript(prev => [...prev, { ...line, timestamp: Date.now() }]);
    }, []);

    const stopAudioSource = (sourceRef: React.MutableRefObject<AudioBufferSourceNode | null>) => {
        if (sourceRef.current) {
            try {
                sourceRef.current.stop();
            } catch (e) { /* ignore if already stopped */ }
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
    };

    const endCall = useCallback(async () => {
        if (callStatusRef.current === 'idle' || callStatusRef.current === 'ended') return;
        setCallStatus('ended');
        setIvrState('ended');
        if(ivrTimeoutRef.current) clearTimeout(ivrTimeoutRef.current);
        
        stopAudioSource(ringToneSourceRef);
        stopAudioSource(holdMusicSourceRef);
        stopAudioSource(bgAmbienceSourceRef);

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        sessionRef.current?.close(); sessionRef.current = null;
        scriptProcessorRef.current?.disconnect(); scriptProcessorRef.current = null;
        if(inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        inputAudioContextRef.current = null;
        if(outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
        outputAudioContextRef.current = null;
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                let finalRecordingUrl = URL.createObjectURL(blob);
    
                if (!isDemoMode && supabase && selectedAgent && callStartTime) {
                    const callId = `call_${Date.now()}`;
                    const filePath = `call_recordings/${callId}.webm`;
                    try {
                        const { error: uploadError } = await supabase.storage.from('studio').upload(filePath, blob);
                        if (uploadError) throw uploadError;
                        const { data: urlData } = supabase.storage.from('studio').getPublicUrl(filePath);
                        if (urlData.publicUrl) {
                            finalRecordingUrl = urlData.publicUrl;
                            addNotification('Call recording saved to cloud storage.', 'success');
                        }
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "Unknown storage error";
                        addNotification(`Failed to upload recording: ${message}`, 'error');
                    }
                }
    
                if (selectedAgent && callStartTime) {
                    const endTime = Date.now();
                    const call: CallRecord = {
                        id: `call_${Date.now()}`,
                        agentId: selectedAgent.id, agentName: selectedAgent.name,
                        startTime: callStartTime, endTime: endTime, duration: endTime - callStartTime,
                        transcript: liveTranscriptRef.current, recordingUrl: finalRecordingUrl,
                    };
                    await addCallToHistory(call);
                    setRecordedAudioUrl(finalRecordingUrl);
                }
    
                recordedChunksRef.current = [];
            };
            mediaRecorderRef.current.stop();
        }
    }, [addCallToHistory, callStartTime, selectedAgent, supabase, addNotification, isDemoMode]);

    const playSound = useCallback((buffer: AudioBuffer | null, options: { loop?: boolean, onEnded?: () => void, gain?: number } = {}): AudioBufferSourceNode | null => {
        const audioCtx = outputAudioContextRef.current;
        if (!audioCtx || !buffer) return null;
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.loop = options.loop || false;
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = options.gain ?? 1.0;

        source.connect(gainNode).connect(audioCtx.destination);
        source.start();
        if (options.onEnded) source.onended = options.onEnded;
        return source;
    }, []);

    const playDtmfTone = useCallback((key: string) => {
        const audioCtx = outputAudioContextRef.current;
        if (!audioCtx || !DTMF[key]) return;
        
        const mainGain = audioCtx.createGain();
        mainGain.connect(audioCtx.destination);
        
        const t0 = audioCtx.currentTime;
        const tEnd = t0 + 0.18; // 180ms duration
        mainGain.gain.setValueAtTime(0, t0);
        mainGain.gain.linearRampToValueAtTime(0.3, t0 + 0.01);
        mainGain.gain.setValueAtTime(0.3, tEnd - 0.02);
        mainGain.gain.linearRampToValueAtTime(0, tEnd);
        
        DTMF[key].forEach(freq => {
            const osc = audioCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(mainGain);
            osc.start(t0);
            osc.stop(tEnd + 0.01);
        });
    }, []);
    
    const startRinging = useCallback(() => { stopAudioSource(ringToneSourceRef); ringToneSourceRef.current = playSound(ringToneBufferRef.current, { loop: true }); }, [playSound]);
    const stopRinging = useCallback(() => { stopAudioSource(ringToneSourceRef); }, []);
    const playFailTone = useCallback(() => { playSound(failToneBufferRef.current); }, [playSound]);

    const connectToAgent = useCallback(async (department: Department) => {
        if (!selectedAgent || !process.env.API_KEY) {
            addNotification('Agent not selected or API key is missing.', 'error');
            setCallStatus('ended');
            playFailTone();
            return;
        }
        const outputCtx = outputAudioContextRef.current;
        if (!outputCtx) {
            addNotification('Output audio context not available.', 'error');
            setCallStatus('ended');
            playFailTone();
            return;
        }

        setCallStatus('connected');
        setCallStartTime(Date.now());
        addLiveTranscript({ speaker: 'System', text: `Connecting to ${department} department...` });
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const inputCtx = inputAudioContextRef.current;

            if (inputVisualizerRef.current && outputVisualizerRef.current) {
                const inputCanvas = inputVisualizerRef.current, outputCanvas = outputVisualizerRef.current;
                const inputCanvasCtx = inputCanvas.getContext('2d'), outputCanvasCtx = outputCanvas.getContext('2d');
                if (inputCanvasCtx && outputCanvasCtx) {
                    inputAnalyserRef.current = inputCtx.createAnalyser(); inputAnalyserRef.current.fftSize = 256;
                    outputAnalyserRef.current = outputCtx.createAnalyser(); outputAnalyserRef.current.fftSize = 256;
                    const animate = () => {
                        if (inputAnalyserRef.current && inputCanvasCtx) drawVisualizer(inputAnalyserRef.current, inputCanvasCtx, inputCanvas, '#fbbf24');
                        if (outputAnalyserRef.current && outputCanvasCtx) drawVisualizer(outputAnalyserRef.current, outputCanvasCtx, outputCanvas, '#2dd4bf');
                        animationFrameRef.current = requestAnimationFrame(animate);
                    };
                    animate();
                }
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = event => recordedChunksRef.current.push(event.data);
            mediaRecorderRef.current.start();
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        const source = inputCtx.createMediaStreamSource(stream);
                        scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            if (isMuted) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: GenAIBlob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(f => f * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessorRef.current).connect(inputCtx.destination);
                        if (inputAnalyserRef.current) source.connect(inputAnalyserRef.current);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const sourceNode = outputCtx.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            const destination = outputAnalyserRef.current ? outputAnalyserRef.current : outputCtx.destination;
                            sourceNode.connect(destination);
                            if (outputAnalyserRef.current) outputAnalyserRef.current.connect(outputCtx.destination);
                            
                            sourceNode.addEventListener('ended', () => audioSourcesRef.current.delete(sourceNode));
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(sourceNode);
                        }
                        if (message.serverContent?.inputTranscription) addLiveTranscript({ speaker: 'You', text: message.serverContent.inputTranscription.text });
                        if (message.serverContent?.outputTranscription) addLiveTranscript({ speaker: 'Agent', text: message.serverContent.outputTranscription.text });
                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => { s.stop(); audioSourcesRef.current.delete(s); });
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        addLiveTranscript({ speaker: 'System', text: `Error: ${e.message}` });
                        endCall();
                    },
                    onclose: () => console.log('Session closed'),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {}, outputAudioTranscription: {},
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[selectedAgent.voice] || 'Kore' }}},
                    systemInstruction: getDepartmentalPrompt(department, selectedAgent.name, 'Turkish Airlines', selectedAgent.voiceDescription),
                },
            });
            sessionRef.current = await sessionPromise;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'An unknown error occurred.';
            addNotification(`Failed to connect: ${message}`, 'error');
            addLiveTranscript({ speaker: 'System', text: `Failed to connect. Please check permissions and configuration.` });
            setCallStatus('ended');
            playFailTone();
        }
    }, [selectedAgent, addLiveTranscript, isMuted, playFailTone, endCall, addNotification]);

    const playIvrPrompt = useCallback(async (text: string, onEnded?: () => void) => {
        if (!process.env.API_KEY || !selectedAgent) {
            addNotification('Cannot play IVR prompt: API key or agent missing.', 'error');
            return;
        }
        const audioCtx = outputAudioContextRef.current;
        if (!audioCtx) {
            addNotification('Audio system not initialized for IVR.', 'error');
            if (onEnded) onEnded();
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts", contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                }
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                playSound(audioBuffer, { onEnded });
            } else {
                throw new Error("TTS API returned no audio data.");
            }
        } catch (error) {
            console.error("IVR prompt failed:", error);
            addNotification('Failed to generate IVR audio prompt.', 'error');
            if (onEnded) onEnded();
        }
    }, [selectedAgent, addNotification, playSound]);
    
    const executeIvrState = useCallback((state: IvrState) => {
        if (callStatusRef.current !== 'connecting') return;
        const config = IVR_CONFIG[state as keyof typeof IVR_CONFIG];
        if (config) {
            const promptText = typeof config.prompt === 'function' ? config.prompt(selectedAgent?.name || 'Customer Service') : config.prompt;
            playIvrPrompt(promptText, () => {
               if(ivrTimeoutRef.current) clearTimeout(ivrTimeoutRef.current);
               ivrTimeoutRef.current = window.setTimeout(() => {
                   playIvrPrompt("I'm sorry, I didn't get a response. Please call back later. Goodbye.", endCall);
               }, config.timeout);
            });
        }
    }, [selectedAgent, playIvrPrompt, endCall]);

    const handleIvrKeyPress = (key: string) => {
        if (ivrState !== 'language_select' && ivrState !== 'main_menu') return;
        playDtmfTone(key);
        setDialedNumber(prev => prev + key);
        if (ivrTimeoutRef.current) clearTimeout(ivrTimeoutRef.current);
        const config = IVR_CONFIG[ivrState];
        const result = config.handleKeyPress(key);
        if (result) {
            if (result.nextState === 'routing' && result.department) {
                setIvrState('routing');
                playIvrPrompt(`Connecting you to the ${result.department} department. Please hold.`, () => {
                    setTimeout(() => connectToAgent(result.department as Department), 1000);
                });
            } else {
                 setIvrState(result.nextState);
            }
        } else {
            playIvrPrompt("I'm sorry, that's not a valid option. Please try again.", () => executeIvrState(ivrState));
        }
    };
    
    useEffect(() => {
        if (callStatus === 'connecting' && (ivrState === 'language_select' || ivrState === 'main_menu')) {
            executeIvrState(ivrState);
        }
        return () => { if (ivrTimeoutRef.current) clearTimeout(ivrTimeoutRef.current) };
    }, [ivrState, callStatus, executeIvrState]);

    const loadSound = useCallback(async (url: string, audioCtx: AudioContext): Promise<AudioBuffer | null> => {
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            return await audioCtx.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`Failed to load sound from ${url}`, error);
            addNotification(`Failed to load critical sound: ${url.split('/').pop()}`, 'error');
            return null;
        }
    }, [addNotification]);
    
    const startCall = async () => {
        if (!selectedAgent || callStatus === 'connecting' || callStatus === 'connected') return;
        resetSimulation();
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        await audioCtx.resume();
        outputAudioContextRef.current = audioCtx;

        if (!ringToneBufferRef.current) {
            addNotification('Preparing sounds...', 'info');
            const [ring, fail, hold, ambience] = await Promise.all([
                loadSound(SOUND_SOURCES.RING_TONE, audioCtx),
                loadSound(SOUND_SOURCES.FAIL_TONE, audioCtx),
                loadSound(SOUND_SOURCES.HOLD_MUSIC, audioCtx),
                loadSound(SOUND_SOURCES.BG_AMBIENCE, audioCtx),
            ]);
            ringToneBufferRef.current = ring;
            failToneBufferRef.current = fail;
            holdMusicBufferRef.current = hold;
            bgAmbienceBufferRef.current = ambience;
        }

        setCallStatus('connecting');
        setIvrState('ringing');
        startRinging();
        
        ivrTimeoutRef.current = window.setTimeout(() => {
            if (callStatusRef.current === 'connecting') {
                stopRinging();
                setIvrState('language_select');
            }
        }, 8000);
    };

    const toggleHold = () => {
        setIsHolding(prev => {
            const newIsHolding = !prev;
            if (newIsHolding) {
                holdMusicSourceRef.current = playSound(holdMusicBufferRef.current, { loop: true });
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                setIsMuted(true);
            } else {
                stopAudioSource(holdMusicSourceRef);
                setIsMuted(false);
            }
            return newIsHolding;
        });
    };

    useEffect(() => {
        if (isBgSoundActive && callStatus === 'connected') {
            stopAudioSource(bgAmbienceSourceRef);
            bgAmbienceSourceRef.current = playSound(bgAmbienceBufferRef.current, { loop: true, gain: 0.08 });
        } else {
            stopAudioSource(bgAmbienceSourceRef);
        }
        return () => stopAudioSource(bgAmbienceSourceRef);
    }, [isBgSoundActive, callStatus, playSound]);
    
    const resetSimulation = () => {
        endCall();
        setCallStatus('idle');
        setIvrState('idle');
        setIsMuted(false);
        setIsHolding(false);
        setLiveTranscript([]);
        setDialedNumber('');
        setRecordedAudioUrl(null);
        setCallStartTime(null);
        recordedChunksRef.current = [];
    };

    const handleStartSimulation = () => {
        if (!selectedAgent) {
            addNotification('Please select an agent first from the Agents page.', 'warn');
            return;
        }
        resetSimulation();
        setIsSimulating(true);
    };
    
    const handleBackToHistory = () => {
        resetSimulation();
        setIsSimulating(false);
    };

    useEffect(() => {
        return () => {
            endCall();
        };
    }, [endCall]);


    // --- Render Functions ---
    const renderHistoryView = () => (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h1 className="text-xl font-semibold text-text">Call History</h1>
                <button onClick={handleStartSimulation} className="flex items-center space-x-2 bg-primary text-white font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    <Phone size={18} />
                    <span>Start Simulation</span>
                </button>
            </div>
            <div className="flex-1 bg-surface border border-border rounded-xl flex overflow-hidden">
                <aside className="w-full md:w-1/3 border-r border-border flex-col md:flex hidden">
                    <div className="p-4 border-b border-border">
                        <div className="relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                placeholder="Search by agent name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-10 pr-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {sortedAndFilteredHistory.length > 0 ? (
                            sortedAndFilteredHistory.map(call => (
                                <button
                                    key={call.id}
                                    onClick={() => setSelectedCall(call)}
                                    className={`w-full text-left p-4 border-b border-border transition-colors ${selectedCall?.id === call.id ? 'bg-primary/10' : 'hover:bg-panel'}`}
                                >
                                    <p className={`font-semibold ${selectedCall?.id === call.id ? 'text-primary' : 'text-text'}`}>{call.agentName}</p>
                                    <p className="text-xs text-subtle">{new Date(call.startTime).toLocaleString()}</p>
                                    <p className="text-xs text-subtle">Duration: {formatDuration(call.duration)}</p>
                                </button>
                            ))
                        ) : (
                            <div className="p-4 text-center text-subtle">No call records found.</div>
                        )}
                    </div>
                </aside>
                <main className="w-full md:w-2/3 p-6 flex flex-col">
                    {selectedCall ? (
                        <>
                            <div className="flex-shrink-0 mb-4">
                                <h2 className="text-lg font-bold text-text">{selectedCall.agentName}</h2>
                                <div className="flex items-center space-x-4 text-sm text-subtle mt-1">
                                    <div className="flex items-center space-x-1.5"><PhoneIncoming size={14} /><span>{new Date(selectedCall.startTime).toLocaleString()}</span></div>
                                    <div className="flex items-center space-x-1.5"><Clock size={14} /><span>{formatDuration(selectedCall.duration)}</span></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 mb-4">
                                <h3 className="text-sm font-semibold text-subtle mb-2">Call Recording</h3>
                                <audio
                                    ref={audioRef}
                                    controls
                                    key={selectedCall.id}
                                    src={selectedCall.recordingUrl}
                                    className="w-full h-10"
                                    onTimeUpdate={() => {
                                        if (audioRef.current) setPlaybackTime(audioRef.current.currentTime * 1000);
                                    }}
                                    onEnded={() => setPlaybackTime(selectedCall.duration)}
                                    onPause={() => {
                                        if (audioRef.current && !audioRef.current.ended) setPlaybackTime(audioRef.current.currentTime * 1000);
                                    }}
                                >
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <h3 className="text-sm font-semibold text-subtle mb-2">Transcript</h3>
                                <HistoryTranscriptView
                                    transcript={selectedCall.transcript}
                                    startTime={selectedCall.startTime}
                                    playbackTime={playbackTime}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-subtle">
                            <FileText size={48} className="mb-4" />
                            <h2 className="text-lg font-semibold">No Call Selected</h2>
                            <p>Select a call from the list to view its details.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );

    const renderSimulationView = () => {
        const SimulationTranscriptView: React.FC<{ transcript: TranscriptLine[] }> = ({ transcript }) => (
            <div aria-live="polite" className="h-full space-y-3 overflow-y-auto pr-2">
                {transcript.map((line, i) => (
                    <div key={i} className={`flex items-start gap-3 ${line.speaker === 'You' ? 'justify-end' : ''}`}>
                        {line.speaker === 'Agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center"><Bot size={18}/></div>}
                        <div className={`p-3 rounded-lg max-w-lg ${line.speaker === 'You' ? 'bg-panel' : 'bg-surface'} ${line.speaker === 'System' ? 'text-center w-full bg-transparent text-subtle text-xs' : ''}`}>
                            <p>{line.text}</p>
                        </div>
                        {line.speaker === 'You' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-panel flex items-center justify-center"><User size={18}/></div>}
                    </div>
                ))}
            </div>
        );

        const dialpadKeys = [
            { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
            { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
            { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
            { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
        ];

        return (
            <div className="relative p-6 h-full flex flex-col">
                 {(callStatus === 'idle' || callStatus === 'ended') && (
                    <button 
                        onClick={handleBackToHistory}
                        className="absolute top-8 left-8 flex items-center space-x-2 text-subtle hover:text-text z-20"
                    >
                        <ArrowLeft size={20} />
                        <span>Back to Call History</span>
                    </button>
                )}
                 <div className="flex-1 flex items-center justify-center">
                    <div className="w-full max-w-6xl h-[85vh] grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="flex items-center justify-center">
                             <div className="relative h-[700px] w-[340px] bg-black rounded-[2.5rem] border-[10px] border-black overflow-hidden shadow-2xl">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-36 bg-black rounded-b-xl z-10"></div>
                                <div className="h-full w-full bg-surface rounded-[2rem] flex flex-col p-4">
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div className="text-center pt-4">
                                            <h2 className="text-lg font-semibold text-text">{selectedAgent?.name || 'Call Simulation'}</h2>
                                            <div className="text-xs h-4 mt-1">
                                                {callStatus === 'idle' && <p className="text-subtle">Ready to call</p>}
                                                {callStatus === 'connecting' && <p className="text-warn animate-pulse">{ivrState}...</p>}
                                                {callStatus === 'connected' && <p className="text-ok">Connected</p>}
                                                {callStatus === 'ended' && <p className="text-danger">Call Ended</p>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="text-center h-10"><p className="text-3xl font-light tracking-widest">{dialedNumber || 'Dial Pad'}</p></div>
                                            <div className="grid grid-cols-3 gap-3">
                                                {dialpadKeys.map(key => <DialpadKey key={key.d} digit={key.d} subtext={key.s} onClick={handleIvrKeyPress} />)}
                                            </div>
                                            <div className="flex items-center space-x-3 pt-2">
                                                 {callStatus === 'connected' ? (
                                                    <>
                                                        <DialerButton className={isMuted ? "bg-white/10" : "bg-panel"} onClick={() => setIsMuted(!isMuted)}>{isMuted ? <MicOff size={24}/> : <Mic size={24}/>}</DialerButton>
                                                        <DialerButton className="bg-danger/80 hover:bg-danger text-white" onClick={endCall} data-id="btn-end-call"><PhoneOff size={24} /></DialerButton>
                                                        <DialerButton className={isHolding ? "bg-brand-gold text-surface" : "bg-panel"} onClick={toggleHold}>{isHolding ? <PlayIcon size={24}/> : <Pause size={24}/>}</DialerButton>
                                                    </>
                                                 ) : (
                                                    <>
                                                        <div className="w-16 h-16" />
                                                        <DialerButton className="bg-ok/80 hover:bg-ok text-white" onClick={startCall} disabled={callStatus !== 'idle' && callStatus !== 'ended'} data-id="btn-start-call"><Phone size={24} /></DialerButton>
                                                        <div className="w-16 h-16" />
                                                    </>
                                                 )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1 text-subtle text-xs">
                                                <Circle size={10} className="text-danger fill-current animate-pulse"/><span>REC</span>
                                            </div>
                                            <div className="flex items-center space-x-1 cursor-pointer" onClick={() => setIsBgSoundActive(!isBgSoundActive)}>
                                                <Volume2 size={14} className={isBgSoundActive ? 'text-brand-teal' : 'text-subtle'}/>
                                                <div className="w-8 h-4 bg-background rounded-full p-0.5 flex items-center"><div className={`w-3 h-3 rounded-full bg-subtle transition-transform ${isBgSoundActive ? 'translate-x-4 bg-brand-teal' : ''}`}/></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-surface border border-border rounded-xl flex flex-col p-6">
                            <div className="flex-1 min-h-0 flex flex-col space-y-4">
                                <div className="grid grid-cols-2 gap-4 h-16">
                                    <div className="flex flex-col items-center"><canvas ref={inputVisualizerRef} className="w-full h-full" /><label className="text-xs text-brand-gold">Your Voice</label></div>
                                    <div className="flex flex-col items-center"><canvas ref={outputVisualizerRef} className="w-full h-full" /><label className="text-xs text-brand-teal">Agent Voice</label></div>
                                </div>
                                <SimulationTranscriptView transcript={liveTranscript} />
                            </div>
                            <div className="pt-4 border-t border-border flex-shrink-0">
                                {recordedAudioUrl ? (
                                    <div className="flex items-center space-x-3">
                                        <p className="text-sm text-subtle">User audio recording:</p>
                                        <audio controls src={recordedAudioUrl} className="w-full h-10"></audio>
                                        <button onClick={() => setRecordedAudioUrl(null)} className="text-subtle hover:text-danger"><Delete size={18}/></button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-center text-subtle">Call recording will appear here after the call ends.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return isSimulating ? renderSimulationView() : renderHistoryView();
};

export default CallHistoryPage;