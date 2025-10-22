
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User, Bot, Delete, Circle, Pause, Play as PlayIcon } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../services/audioUtils';
import { TranscriptLine, CallRecord } from '../types';
import { useAppContext } from '../App';
import { getDepartmentalPrompt, Department } from '../App';

// --- Web Audio Synthesizer for UI Sounds ---
// Uses Web Audio API to generate sounds directly, avoiding file loading issues.

// DTMF Frequencies (ITU-T Rec. Q.23)
const DTMF: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

// Hold music is complex and remains a file-based source.
const SOUND_SOURCES = {
    HOLD_MUSIC: [
        { src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1811b37ac8.mp3', type: 'audio/mpeg' },
    ],
};


const DialerButton: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void, 'data-id'?: string; disabled?: boolean }> = ({ children, className, onClick, 'data-id': dataId, disabled }) => (
    <button onClick={onClick} data-id={dataId} disabled={disabled} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${className} disabled:opacity-50 disabled:cursor-not-allowed`}>
        {children}
    </button>
);

const DialpadKey: React.FC<{ digit: string; subtext?: string; onClick: (digit: string) => void }> = ({ digit, subtext, onClick }) => (
    <button onClick={() => onClick(digit)} className="rounded-full w-20 h-20 flex flex-col items-center justify-center bg-eburon-bg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-teal">
        <span className="text-3xl font-light">{digit}</span>
        {subtext && <span className="text-xs text-eburon-muted -mt-1">{subtext}</span>}
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
    'Natural Warm': 'Kore',
    'Professional Male': 'Puck',
    'Upbeat Female': 'Zephyr',
    'Calm Narrator': 'Charon',
    'Friendly': 'Fenrir',
    'Elegant Female': 'Aoede'
};

type IvrState = 'idle' | 'ringing' | 'language_select' | 'main_menu' | 'routing' | 'connected_to_agent' | 'ended';

const IVR_CONFIG = {
    language_select: {
        prompt: (agentName: string) => `Thank you for calling ${agentName.split(' ')[0]}. For English, press 1. Para Español, oprima el número dos.`,
        timeout: 7000,
        handleKeyPress: (key: string): { nextState: IvrState, department?: Department } | null => {
            if (key === '1' || key === '2') {
                return { nextState: 'main_menu' };
            }
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
            if (department) {
                return { nextState: 'routing', department };
            }
            return null;
        }
    }
};

const CallsPage: React.FC = () => {
    const { selectedAgent, addCallToHistory } = useAppContext();
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
    const [ivrState, setIvrState] = useState<IvrState>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [isHolding, setIsHolding] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [dialedNumber, setDialedNumber] = useState('');
    const isRecording = true;
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [isBgSoundActive, setIsBgSoundActive] = useState(false);
    const [callStartTime, setCallStartTime] = useState<number | null>(null);
    
    const sessionRef = useRef<any | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const ivrAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptRef = useRef(transcript);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const holdMusicRef = useRef<HTMLAudioElement | null>(null);
    const ivrTimeoutRef = useRef<number | null>(null);
    const callStatusRef = useRef(callStatus);

    const inputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const outputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // --- Web Audio Synthesizer for UI Sounds ---
    const uiAudioContextRef = useRef<AudioContext | null>(null);
    const uiMasterGainRef = useRef<GainNode | null>(null);
    const ringingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const failToneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const bgNodesRef = useRef<{ src: AudioBufferSourceNode; modOsc: OscillatorNode; } | null>(null);

    const ensureUiAudioContext = useCallback(() => {
        if (!uiAudioContextRef.current) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            uiAudioContextRef.current = ctx;
            const masterGain = ctx.createGain();
            masterGain.gain.value = 0.7; // Master volume for UI sounds
            masterGain.connect(ctx.destination);
            uiMasterGainRef.current = masterGain;
        }
        if (uiAudioContextRef.current.state === 'suspended') {
            uiAudioContextRef.current.resume();
        }
        return uiAudioContextRef.current;
    }, []);

    const playTones = useCallback((frequencies: number[], { duration = 200, gain = 0.5, type = 'sine' }: { duration?: number, gain?: number, type?: OscillatorType }) => {
        const ctx = ensureUiAudioContext();
        if (!ctx || !uiMasterGainRef.current) return;

        const mainGain = ctx.createGain();
        mainGain.connect(uiMasterGainRef.current);

        const t0 = ctx.currentTime;
        const tEnd = t0 + duration / 1000;

        mainGain.gain.setValueAtTime(0, t0);
        mainGain.gain.linearRampToValueAtTime(gain, t0 + 0.01);
        mainGain.gain.setValueAtTime(gain, tEnd - 0.02);
        mainGain.gain.linearRampToValueAtTime(0, tEnd);

        frequencies.forEach(freq => {
            const osc = ctx.createOscillator();
            osc.type = type;
            osc.frequency.value = freq;
            osc.connect(mainGain);
            osc.start(t0);
            osc.stop(tEnd + 0.01);
        });
    }, [ensureUiAudioContext]);
    
    const playRingTone = useCallback(() => playTones([440, 480], { duration: 2000, gain: 0.5 }), [playTones]);
    const playDtmfTone = useCallback((key: string) => { if (DTMF[key]) playTones(DTMF[key], { duration: 180, gain: 0.3 }) }, [playTones]);
    
    const stopRinging = useCallback(() => {
        if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
        ringingIntervalRef.current = null;
    }, []);

    const startRinging = useCallback(() => {
        stopRinging();
        playRingTone();
        ringingIntervalRef.current = setInterval(playRingTone, 6000);
    }, [playRingTone, stopRinging]);
    
    const stopFailTone = useCallback(() => {
        if(failToneIntervalRef.current) clearInterval(failToneIntervalRef.current);
        failToneIntervalRef.current = null;
    }, []);

    const playFailTone = useCallback(() => {
        stopFailTone();
        const playBeep = () => playTones([480, 620], { duration: 400, gain: 0.4 });
        playBeep();
        failToneIntervalRef.current = setInterval(playBeep, 800);
        setTimeout(() => stopFailTone(), 4000);
    }, [playTones, stopFailTone]);

    const startBgAmbience = useCallback(() => {
        const ctx = ensureUiAudioContext();
        if (!ctx || !uiMasterGainRef.current || bgNodesRef.current) return;
        
        const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
        const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 1000; bp1.Q.value = 0.7;
        const bp2 = ctx.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 600; bp2.Q.value = 0.6;
        const mainGain = ctx.createGain(); mainGain.gain.value = 0.05; // very quiet
        
        const modOsc = ctx.createOscillator(); modOsc.type = "sine"; modOsc.frequency.value = 0.25;
        const modGain = ctx.createGain(); modGain.gain.value = 0.1;
        
        src.connect(bp1).connect(bp2).connect(mainGain).connect(uiMasterGainRef.current);
        modOsc.connect(modGain).connect(mainGain.gain);
        
        src.start(); modOsc.start();
        bgNodesRef.current = { src, modOsc };
    }, [ensureUiAudioContext]);
    
    const stopBgAmbience = useCallback(() => {
        const nodes = bgNodesRef.current;
        if (!nodes) return;
        try { nodes.src.stop(); nodes.modOsc.stop(); } catch {}
        bgNodesRef.current = null;
    }, []);
    // --- End Web Audio ---

    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    useEffect(() => {
        if (isBgSoundActive) startBgAmbience();
        else stopBgAmbience();
    }, [isBgSoundActive, startBgAmbience, stopBgAmbience]);

    const addTranscript = useCallback((line: Omit<TranscriptLine, 'timestamp'>) => {
        setTranscript(prev => [...prev, { ...line, timestamp: Date.now() }]);
    }, []);
    
    const endCall = useCallback(() => {
        if (callStatusRef.current === 'idle' || callStatusRef.current === 'ended') return;

        setCallStatus('ended');
        setIvrState('ended');
        clearTimeout(ivrTimeoutRef.current as number);
        stopRinging();
        stopFailTone();
        
        const holdMusic = holdMusicRef.current;
        if (holdMusic && !holdMusic.paused) { holdMusic.pause(); holdMusic.currentTime = 0; }
        
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;

        sessionRef.current?.close(); sessionRef.current = null;
        
        scriptProcessorRef.current?.disconnect(); scriptProcessorRef.current = null;
        if(inputAudioContextRef.current?.state !== 'closed') inputAudioContextRef.current?.close();
        if(outputAudioContextRef.current?.state !== 'closed') outputAudioContextRef.current?.close();
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedAudioUrl(url);
                
                if (selectedAgent && callStartTime) {
                    const endTime = Date.now();
                    const call: CallRecord = {
                        id: `call_${Date.now()}`, agentId: selectedAgent.id, agentName: selectedAgent.name,
                        startTime: callStartTime, endTime: endTime, duration: endTime - callStartTime,
                        transcript: transcriptRef.current, recordingUrl: url,
                    };
                    addCallToHistory(call);
                }
                recordedChunksRef.current = [];
            };
            mediaRecorderRef.current.stop();
        }
    }, [addCallToHistory, callStartTime, selectedAgent, stopFailTone, stopRinging]);

    const startCall = async () => {
        if (!selectedAgent || callStatusRef.current === 'connecting' || callStatusRef.current === 'connected') return;
        
        setDialedNumber('');
        setCallStatus('connecting');
        setIvrState('ringing');
        
        ensureUiAudioContext();
        startRinging();

        const ivrStartTime = 8000; // FIX: Changed from 14000 to 8000
        ivrTimeoutRef.current = setTimeout(() => {
            if (callStatusRef.current === 'connecting') {
                stopRinging();
                setIvrState('language_select');
            }
        }, ivrStartTime);
    };

    const connectToAgent = useCallback(async (department: Department) => {
        if (!selectedAgent || !process.env.API_KEY) {
            console.error("Agent or API_KEY not selected.");
            setCallStatus('ended');
            playFailTone();
            return;
        }

        setCallStatus('connected');
        setCallStartTime(Date.now());
        addTranscript({ speaker: 'System', text: `Connecting to ${department} department...` });
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            const inputCtx = inputAudioContextRef.current;
            const outputCtx = outputAudioContextRef.current;

            if (inputVisualizerRef.current && outputVisualizerRef.current) {
                const inputCanvas = inputVisualizerRef.current, outputCanvas = outputVisualizerRef.current;
                const inputCanvasCtx = inputCanvas.getContext('2d'), outputCanvasCtx = outputCanvas.getContext('2d');
                
                inputAnalyserRef.current = inputCtx.createAnalyser(); inputAnalyserRef.current.fftSize = 256;
                outputAnalyserRef.current = outputCtx.createAnalyser(); outputAnalyserRef.current.fftSize = 256;

                const animate = () => {
                    if (inputAnalyserRef.current && inputCanvasCtx) drawVisualizer(inputAnalyserRef.current, inputCanvasCtx, inputCanvas, '#fbbf24');
                    if (outputAnalyserRef.current && outputCanvasCtx) drawVisualizer(outputAnalyserRef.current, outputCanvasCtx, outputCanvas, '#2dd4bf');
                    animationFrameRef.current = requestAnimationFrame(animate);
                };
                animate();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            if (isRecording) {
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = event => recordedChunksRef.current.push(event.data);
                mediaRecorderRef.current.start();
            }
            
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
                                data: encode(new Int16Array(inputData.map(f => f * 32768)).buffer as any),
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
                            if(outputAnalyserRef.current) outputAnalyserRef.current.connect(outputCtx.destination);
                            
                            sourceNode.addEventListener('ended', () => audioSourcesRef.current.delete(sourceNode));
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(sourceNode);
                        }

                        if (message.serverContent?.inputTranscription) addTranscript({ speaker: 'You', text: message.serverContent.inputTranscription.text });
                        if (message.serverContent?.outputTranscription) addTranscript({ speaker: 'Agent', text: message.serverContent.outputTranscription.text });

                        if (message.serverContent?.interrupted) {
                            audioSourcesRef.current.forEach(s => { s.stop(); audioSourcesRef.current.delete(s); });
                            nextStartTimeRef.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        addTranscript({ speaker: 'System', text: `Error: ${e.message}` });
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
            console.error("Failed to start call:", error);
            addTranscript({ speaker: 'System', text: `Failed to connect. Please check permissions and configuration.` });
            setCallStatus('ended');
            playFailTone();
        }
    }, [selectedAgent, addTranscript, isMuted, isRecording, playFailTone, endCall]);

    
    useEffect(() => {
        return () => { endCall(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playIvrPrompt = useCallback(async (text: string, onEnded?: () => void) => {
        if (!process.env.API_KEY || !selectedAgent) return;
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
                if (!ivrAudioContextRef.current) ivrAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const audioCtx = ivrAudioContextRef.current;
                if (audioCtx.state === 'closed') return; // Prevent errors on closed context
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
                if (onEnded) source.onended = onEnded;
            }
        } catch (error) {
            console.error("IVR prompt failed:", error);
            if (onEnded) onEnded();
        }
    }, [selectedAgent]);
    
    // FIX: Refactored IVR state execution into a reusable function for robustness.
    const executeIvrState = useCallback((state: IvrState) => {
        if (callStatusRef.current !== 'connecting') return;
    
        const config = IVR_CONFIG[state as keyof typeof IVR_CONFIG];
        if (config) {
            const promptText = typeof config.prompt === 'function' ? config.prompt(selectedAgent?.name || 'Customer Service') : config.prompt;
            
            playIvrPrompt(promptText, () => {
               clearTimeout(ivrTimeoutRef.current as number);
               ivrTimeoutRef.current = setTimeout(() => {
                   playIvrPrompt("I'm sorry, I didn't get a response. Please call back later. Goodbye.", endCall);
               }, config.timeout);
            });
        }
    }, [selectedAgent, playIvrPrompt, endCall]);

    // FIX: Refactored to be more robust and handle invalid input correctly.
    const handleIvrKeyPress = (key: string) => {
        if (ivrState !== 'language_select' && ivrState !== 'main_menu') return;
        
        playDtmfTone(key);
        setDialedNumber(prev => prev + key);
        clearTimeout(ivrTimeoutRef.current as number);

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
            playIvrPrompt("I'm sorry, that's not a valid option. Please try again.", () => {
                executeIvrState(ivrState); // Re-run the current state prompt
            });
        }
    };
    
    // FIX: Replaced original effect with a cleaner one using the new executeIvrState function.
    useEffect(() => {
        if (callStatus === 'connecting' && (ivrState === 'language_select' || ivrState === 'main_menu')) {
            executeIvrState(ivrState);
        }
        return () => clearTimeout(ivrTimeoutRef.current as number);
    }, [ivrState, callStatus, executeIvrState]);


    const TranscriptView = () => (
        <div aria-live="polite" className="h-full space-y-3 overflow-y-auto pr-2">
            {transcript.map((line, i) => (
                <div key={i} className={`flex items-start gap-3 ${line.speaker === 'You' ? 'justify-end' : ''}`}>
                    {line.speaker === 'Agent' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center"><Bot size={18}/></div>}
                    <div className={`p-3 rounded-lg max-w-lg ${line.speaker === 'You' ? 'bg-eburon-border' : 'bg-eburon-bg'} ${line.speaker === 'System' ? 'text-center w-full bg-transparent text-eburon-muted text-xs' : ''}`}>
                        <p>{line.text}</p>
                    </div>
                     {line.speaker === 'You' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-eburon-border flex items-center justify-center"><User size={18}/></div>}
                </div>
            ))}
        </div>
    );

    const toggleHold = () => {
        setIsHolding(prev => {
            const holdMusic = holdMusicRef.current;
            if (!holdMusic) return !prev;
            const newIsHolding = !prev;
            if (newIsHolding) {
                holdMusic.play().catch(e => console.error("Hold music failed to play", e));
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                setIsMuted(true);
            } else {
                if (!holdMusic.paused) { holdMusic.pause(); holdMusic.currentTime = 0; }
                setIsMuted(false);
            }
            return newIsHolding;
        });
    };
    
    const dialpadKeys = [
        { d: '1', s: '' }, { d: '2', s: 'ABC' }, { d: '3', s: 'DEF' },
        { d: '4', s: 'GHI' }, { d: '5', s: 'JKL' }, { d: '6', s: 'MNO' },
        { d: '7', s: 'PQRS' }, { d: '8', s: 'TUV' }, { d: '9', s: 'WXYZ' },
        { d: '*', s: '' }, { d: '0', s: '+' }, { d: '#', s: '' },
    ];

    return (
        <div className="p-6 h-full flex items-center justify-center">
            <audio ref={holdMusicRef} loop preload="auto">
                {SOUND_SOURCES.HOLD_MUSIC.map(s => <source key={s.src} src={s.src} type={s.type} />)}
            </audio>

            <div className="w-full max-w-5xl h-[80vh] bg-eburon-card border border-eburon-border rounded-xl flex">
                <div className="w-1/3 p-6 flex flex-col justify-between border-r border-eburon-border">
                    <div>
                        <h2 className="text-lg font-semibold text-eburon-text">
                            {callStatus === 'connected' ? `Talking to ${selectedAgent?.name}` : 'Call Simulation'}
                        </h2>
                        <p className="text-eburon-muted text-sm">{selectedAgent?.personaShortText}</p>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-4">
                        <div className="text-center h-10">
                             <p className="text-3xl font-light tracking-widest">{dialedNumber || 'Dial Pad'}</p>
                             {callStatus === 'connecting' && <p className="text-sm text-warn animate-pulse">{ivrState}...</p>}
                             {callStatus === 'connected' && <p className="text-sm text-ok">Connected</p>}
                             {callStatus === 'ended' && <p className="text-sm text-danger">Call Ended</p>}
                        </div>

                         <div className="grid grid-cols-3 gap-4">
                             {dialpadKeys.map(key => <DialpadKey key={key.d} digit={key.d} subtext={key.s} onClick={handleIvrKeyPress} />)}
                         </div>

                         <div className="flex items-center space-x-4 pt-4">
                             {callStatus === 'connected' ? (
                                <>
                                    <DialerButton className={isMuted ? "bg-white/10" : "bg-eburon-bg"} onClick={() => setIsMuted(!isMuted)}>
                                        {isMuted ? <MicOff size={32}/> : <Mic size={32}/>}
                                    </DialerButton>
                                    <DialerButton className="bg-danger/80 hover:bg-danger text-white" onClick={endCall} data-id="btn-end-call">
                                        <PhoneOff size={32} />
                                    </DialerButton>
                                    <DialerButton className={isHolding ? "bg-brand-gold text-eburon-bg" : "bg-eburon-bg"} onClick={toggleHold}>
                                        {isHolding ? <PlayIcon size={32}/> : <Pause size={32}/>}
                                    </DialerButton>
                                </>
                             ) : (
                                <>
                                    <div className="w-20 h-20" /> {/* Placeholder */}
                                    <DialerButton className="bg-ok/80 hover:bg-ok text-white" onClick={startCall} disabled={callStatus !== 'idle' && callStatus !== 'ended'} data-id="btn-start-call">
                                        <Phone size={32} />
                                    </DialerButton>
                                    <div className="w-20 h-20" /> {/* Placeholder */}
                                </>
                             )}
                         </div>
                    </div>
                    
                     <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-2 text-eburon-muted text-sm">
                             {isRecording ? <><Circle size={12} className="text-danger fill-current animate-pulse"/><span>REC</span></> : <span>Not Recording</span>}
                         </div>
                         <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setIsBgSoundActive(!isBgSoundActive)}>
                             <Volume2 size={16} className={isBgSoundActive ? 'text-brand-teal' : 'text-eburon-muted'}/>
                             <div className="w-10 h-5 bg-eburon-bg rounded-full p-1 flex items-center">
                                <div className={`w-3.5 h-3.5 rounded-full bg-eburon-muted transition-transform ${isBgSoundActive ? 'translate-x-5 bg-brand-teal' : ''}`}/>
                             </div>
                         </div>
                    </div>
                </div>

                <div className="w-2/3 p-6 flex flex-col">
                    <div className="flex-1 min-h-0 flex flex-col space-y-2">
                        <div className="grid grid-cols-2 gap-4 h-16">
                            <div className="flex flex-col items-center">
                                <canvas ref={inputVisualizerRef} className="w-full h-full" />
                                <label className="text-xs text-brand-gold">Your Voice</label>
                            </div>
                             <div className="flex flex-col items-center">
                                <canvas ref={outputVisualizerRef} className="w-full h-full" />
                                <label className="text-xs text-brand-teal">Agent Voice</label>
                            </div>
                        </div>
                        <TranscriptView />
                    </div>
                    <div className="pt-4 border-t border-eburon-border flex-shrink-0">
                         {recordedAudioUrl ? (
                             <div className="flex items-center space-x-3">
                                <p className="text-sm text-eburon-muted">User audio recording:</p>
                                <audio controls src={recordedAudioUrl} className="w-full h-10">Your browser does not support the audio element.</audio>
                                <button onClick={() => setRecordedAudioUrl(null)} className="text-eburon-muted hover:text-danger"><Delete size={18}/></button>
                            </div>
                         ) : (
                             <p className="text-sm text-center text-eburon-muted">Call recording will appear here after the call ends.</p>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallsPage;
