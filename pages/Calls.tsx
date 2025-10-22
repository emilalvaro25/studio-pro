
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, User, Bot, Delete, Circle, Pause, Play as PlayIcon } from 'lucide-react';
// FIX: Remove deprecated 'LiveSession' and alias 'Blob' to 'GenAIBlob' to avoid naming conflicts with the native Blob type.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenAIBlob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../services/audioUtils';
import { TranscriptLine, CallRecord } from '../types';
import { useAppContext } from '../App';
import { getDepartmentalPrompt, Department } from '../App';

// Sound effects from reliable, stable public domain sources to prevent hotlinking or availability issues.
const SOUND_SOURCES = {
    BACKGROUND_AMBIENCE: [
        { src: 'https://archive.org/download/office-ambience/Office-ambience.mp3', type: 'audio/mpeg' },
    ],
    HOLD_MUSIC: [
        // This Pixabay link has been reliable.
        { src: 'https://cdn.pixabay.com/audio/2022/05/27/audio_1811b37ac8.mp3', type: 'audio/mpeg' },
    ],
    KEYPAD_TONE: [
        { src: 'https://archive.org/download/dtmf-touch-tones/1.mp3', type: 'audio/mpeg' },
        { src: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Dtmf1.ogg', type: 'audio/ogg' },
    ],
    RINGING_TONE: [
        { src: 'https://archive.org/download/classic-telephone-ringtone/classic-telephone-ringtone.mp3', type: 'audio/mpeg' },
        { src: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Telephone-ring-US.ogg', type: 'audio/ogg' },
    ],
    FAIL_TONE: [
        { src: 'https://archive.org/download/Busy_Signal/Busy_Signal_1.mp3', type: 'audio/mpeg' },
        { src: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Busy-signal.ogg', type: 'audio/ogg' },
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
    const bufferLength = analyser.frequencyBinCount; // e.g., 128 with fftSize=256
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Display fewer bars for a cleaner look.
    const numBars = 64;
    const barWidth = canvas.width / numBars;

    const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.1, color);
    gradient.addColorStop(0.6, `${color}A0`);
    gradient.addColorStop(1, `${color}30`);

    canvasCtx.fillStyle = gradient;
    
    // We have more data points (e.g., 128) than bars (64), so let's average them.
    const step = Math.floor(bufferLength / numBars);

    for (let i = 0; i < numBars; i++) {
        let sum = 0;
        // Average a few data points for each bar
        for (let j = 0; j < step; j++) {
            sum += dataArray[i * step + j];
        }
        const avg = step > 0 ? sum / step : dataArray[i];

        // Apply a non-linear scale to make quiet sounds more visible and prevent clipping.
        // This makes the visualizer feel more "alive".
        const barHeight = Math.pow(avg / 255.0, 2.2) * canvas.height;

        // Draw from the vertical center
        const x = i * barWidth;
        const y = (canvas.height - barHeight) / 2;

        if (barHeight > 0) {
            canvasCtx.fillRect(x, y, barWidth - 1, barHeight); // -1 for spacing
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
            if (key === '1' || key === '2') { // Accept both English and Spanish
                return { nextState: 'main_menu' };
            }
            return null; // Invalid input
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
            return null; // Invalid input
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
    const isRecording = true; // Always record calls now
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
    const audioBgRef = useRef<HTMLAudioElement | null>(null);
    const holdMusicRef = useRef<HTMLAudioElement | null>(null);
    const keypadToneRef = useRef<HTMLAudioElement | null>(null);
    const ringingToneRef = useRef<HTMLAudioElement | null>(null);
    const failToneRef = useRef<HTMLAudioElement | null>(null);
    const ivrTimeoutRef = useRef<number | null>(null);
    const callStatusRef = useRef(callStatus);

    const inputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const outputVisualizerRef = useRef<HTMLCanvasElement | null>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        callStatusRef.current = callStatus;
    }, [callStatus]);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        const audioEl = audioBgRef.current;
        if (audioEl) {
            if (isBgSoundActive) {
                audioEl.volume = 0.1; // Low volume
                audioEl.play().catch(error => console.warn("Background audio playback failed:", error));
            } else {
                audioEl.pause();
                audioEl.currentTime = 0;
            }
        }
        return () => {
            audioEl?.pause();
        };
    }, [isBgSoundActive]);


    const addTranscript = useCallback((line: Omit<TranscriptLine, 'timestamp'>) => {
        setTranscript(prev => [...prev, { ...line, timestamp: Date.now() }]);
    }, []);
    

    const startCall = async () => {
        if (!selectedAgent) return;
        setDialedNumber('');
        setCallStatus('connecting');
        setIvrState('ringing');
        ringingToneRef.current?.play().catch(e => console.error("Ringing tone failed to play:", e));
        
        // Simulate ringing for a few seconds before "connecting"
        setTimeout(() => {
            const ringTone = ringingToneRef.current;
            // FIX: Only pause if it's actually playing to avoid race conditions.
            if (ringTone && !ringTone.paused) {
                ringTone.pause();
                ringTone.currentTime = 0;
            }

            // FIX: Only proceed if the call wasn't cancelled during ringing.
            if (callStatusRef.current === 'connecting') {
                setIvrState('language_select');
            }
        }, 3000);
    };


    const connectToAgent = useCallback(async (department: Department) => {
        if (!selectedAgent || !process.env.API_KEY) {
            console.error("Agent or API_KEY not selected.");
            setCallStatus('ended');
            const tone = failToneRef.current;
            if (tone) {
                tone.currentTime = 0;
                tone.play().catch(e => console.error("Failed to play fail tone", e));
            }
            return;
        }

        setCallStatus('connected');
        setCallStartTime(Date.now());
        addTranscript({ speaker: 'System', text: `Connecting to ${department} department...` });
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Audio Contexts
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            // Visualizer setup
            const inputCtx = inputAudioContextRef.current;
            const outputCtx = outputAudioContextRef.current;

            if (inputVisualizerRef.current && outputVisualizerRef.current) {
                const inputCanvas = inputVisualizerRef.current;
                const outputCanvas = outputVisualizerRef.current;
                const inputCanvasCtx = inputCanvas.getContext('2d');
                const outputCanvasCtx = outputCanvas.getContext('2d');
                
                inputAnalyserRef.current = inputCtx.createAnalyser();
                inputAnalyserRef.current.fftSize = 256;
                outputAnalyserRef.current = outputCtx.createAnalyser();
                outputAnalyserRef.current.fftSize = 256;

                const animate = () => {
                    if (inputAnalyserRef.current && inputCanvasCtx) {
                        drawVisualizer(inputAnalyserRef.current, inputCanvasCtx, inputCanvas, '#fbbf24'); // brand-gold
                    }
                    if (outputAnalyserRef.current && outputCanvasCtx) {
                        drawVisualizer(outputAnalyserRef.current, outputCanvasCtx, outputCanvas, '#2dd4bf'); // brand-teal
                    }
                    animationFrameRef.current = requestAnimationFrame(animate);
                };
                animate();
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            // Media Recorder setup for user audio
            if (isRecording) {
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = event => {
                    recordedChunksRef.current.push(event.data);
                };
                mediaRecorderRef.current.start();
            }
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log('Session opened');
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
                        
                        source.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputCtx.destination);
                        
                        if (inputAnalyserRef.current) {
                            source.connect(inputAnalyserRef.current);
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;

                            if (outputAnalyserRef.current) {
                                source.connect(outputAnalyserRef.current);
                                outputAnalyserRef.current.connect(outputCtx.destination);
                            } else {
                                source.connect(outputCtx.destination);
                            }
                            
                            source.addEventListener('ended', () => {
                                audioSourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                        }

                        if (message.serverContent?.inputTranscription) {
                            addTranscript({ speaker: 'You', text: message.serverContent.inputTranscription.text });
                        }
                        if (message.serverContent?.outputTranscription) {
                            addTranscript({ speaker: 'Agent', text: message.serverContent.outputTranscription.text });
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of audioSourcesRef.current.values()) {
                                source.stop();
                                audioSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }

                        if (message.serverContent?.turnComplete) {
                            console.log('Turn completed');
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        addTranscript({ speaker: 'System', text: `Error: ${e.message}` });
                        endCall();
                    },
                    onclose: () => {
                        console.log('Session closed');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: VOICE_MAP[selectedAgent.voice] || 'Kore' },
                        },
                    },
                    systemInstruction: getDepartmentalPrompt(department, selectedAgent.name, 'Turkish Airlines', selectedAgent.voiceDescription),
                },
            });

            sessionRef.current = await sessionPromise;

        } catch (error) {
            console.error("Failed to start call:", error);
            addTranscript({ speaker: 'System', text: `Failed to connect. Please check permissions and configuration.` });
            setCallStatus('ended');
            const tone = failToneRef.current;
            if (tone) {
                tone.currentTime = 0;
                tone.play().catch(e => console.error("Failed to play fail tone", e));
            }
        }

    }, [selectedAgent, addTranscript, isMuted, isRecording]);


    const endCall = () => {
        if (callStatusRef.current === 'idle' || callStatusRef.current === 'ended') return;

        setCallStatus('ended');
        setIvrState('ended');
        clearTimeout(ivrTimeoutRef.current as number);
        
        // FIX: Safely pause audio to prevent race condition errors on quick hang-ups.
        const ringTone = ringingToneRef.current;
        if (ringTone && !ringTone.paused) {
            ringTone.pause();
            ringTone.currentTime = 0;
        }
        const holdMusic = holdMusicRef.current;
        if (holdMusic && !holdMusic.paused) {
            holdMusic.pause();
            holdMusic.currentTime = 0;
        }
        
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Clean up session
        sessionRef.current?.close();
        sessionRef.current = null;
        
        // Clean up audio contexts
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
        
        // Stop recording and create blob URL
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedAudioUrl(url);
                
                if (selectedAgent && callStartTime) {
                    const endTime = Date.now();
                    const call: CallRecord = {
                        id: `call_${Date.now()}`,
                        agentId: selectedAgent.id,
                        agentName: selectedAgent.name,
                        startTime: callStartTime,
                        endTime: endTime,
                        duration: endTime - callStartTime,
                        transcript: transcriptRef.current,
                        recordingUrl: url,
                    };
                    addCallToHistory(call);
                }
                recordedChunksRef.current = [];
            };
            mediaRecorderRef.current.stop();
        }
    };
    
    useEffect(() => {
        return () => {
            // Ensure cleanup happens on component unmount
            endCall();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playIvrPrompt = useCallback(async (text: string, onEnded?: () => void) => {
        if (!process.env.API_KEY || !selectedAgent) return;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
                }
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                if (!ivrAudioContextRef.current) {
                     ivrAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const audioCtx = ivrAudioContextRef.current;
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
                if (onEnded) {
                    source.onended = onEnded;
                }
            }
        } catch (error) {
            console.error("IVR prompt failed:", error);
             if (onEnded) onEnded();
        }
    }, [selectedAgent]);


    const handleIvrKeyPress = (key: string) => {
        if (ivrState !== 'language_select' && ivrState !== 'main_menu') return;
        
        // FIX: Reset and play sound effect to handle rapid presses correctly.
        const keypadTone = keypadToneRef.current;
        if (keypadTone) {
            keypadTone.currentTime = 0;
            keypadTone.play().catch(e => console.error("Failed to play keypad tone", e));
        }

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
                setIvrState(ivrState); // Re-trigger the same state
            });
        }
    };
    
    useEffect(() => {
        if (callStatus === 'connecting' || callStatus === 'connected') {
            const config = IVR_CONFIG[ivrState as keyof typeof IVR_CONFIG];
            if (config) {
                const promptText = typeof config.prompt === 'function' ? config.prompt(selectedAgent?.name || 'Customer Service') : config.prompt;
                
                playIvrPrompt(promptText, () => {
                   ivrTimeoutRef.current = setTimeout(() => {
                       playIvrPrompt("I didn't receive a response. Goodbye.", endCall);
                   }, config.timeout);
                });
            }
        }
        
        return () => clearTimeout(ivrTimeoutRef.current as number);

    }, [ivrState, callStatus, selectedAgent, playIvrPrompt, endCall]);

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

            if (newIsHolding) { // Going on hold
                holdMusic.play().catch(e => console.error("Hold music failed to play", e));
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                setIsMuted(true);
            } else { // Coming off hold
                // FIX: Safely pause audio to prevent race conditions on quick toggles.
                if (!holdMusic.paused) {
                    holdMusic.pause();
                    holdMusic.currentTime = 0;
                }
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
             <audio ref={audioBgRef} loop preload="auto">
                {SOUND_SOURCES.BACKGROUND_AMBIENCE.map(s => <source key={s.src} src={s.src} type={s.type} />)}
                Your browser does not support background audio.
            </audio>
            <audio ref={holdMusicRef} loop preload="auto">
                {SOUND_SOURCES.HOLD_MUSIC.map(s => <source key={s.src} src={s.src} type={s.type} />)}
                Your browser does not support hold music audio.
            </audio>
            <audio ref={keypadToneRef} preload="auto">
                {SOUND_SOURCES.KEYPAD_TONE.map(s => <source key={s.src} src={s.src} type={s.type} />)}
                Your browser does not support keypad tones.
            </audio>
            <audio ref={ringingToneRef} loop preload="auto">
                {SOUND_SOURCES.RINGING_TONE.map(s => <source key={s.src} src={s.src} type={s.type} />)}
                Your browser does not support ringing tones.
            </audio>
            <audio ref={failToneRef} preload="auto">
                {SOUND_SOURCES.FAIL_TONE.map(s => <source key={s.src} src={s.src} type={s.type} />)}
                Your browser does not support failure tones.
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
