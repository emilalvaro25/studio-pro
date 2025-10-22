import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, Mic, MicOff, Volume2, User, Bot, Delete } from 'lucide-react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import { decode, encode, decodeAudioData } from '../services/audioUtils';
import { TranscriptLine } from '../types';
import { useAppContext } from '../App';

const DialerButton: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className, onClick }) => (
    <button onClick={onClick} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${className}`}>
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
    'Friendly': 'Fenrir'
};

const CallsPage: React.FC = () => {
    const { selectedAgent } = useAppContext();
    const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'ended'>('idle');
    const [isMuted, setIsMuted] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
    const [dialedNumber, setDialedNumber] = useState('');
    
    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const transcriptRef = useRef(transcript);

    const inputVisualizerRef = useRef<HTMLCanvasElement>(null);
    const outputVisualizerRef = useRef<HTMLCanvasElement>(null);
    const inputAnalyserRef = useRef<AnalyserNode | null>(null);
    const outputAnalyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    const addTranscriptLine = (speaker: 'You' | 'Agent' | 'System', text: string) => {
        setTranscript(prev => [...prev, { speaker, text, timestamp: Date.now() }]);
    };

    const startVisualizers = useCallback(() => {
        const draw = () => {
            if (inputAnalyserRef.current && inputVisualizerRef.current) {
                const canvasCtx = inputVisualizerRef.current.getContext('2d');
                if (canvasCtx) drawVisualizer(inputAnalyserRef.current, canvasCtx, inputVisualizerRef.current, '#f6c453');
            }
            if (outputAnalyserRef.current && outputVisualizerRef.current) {
                const canvasCtx = outputVisualizerRef.current.getContext('2d');
                if (canvasCtx) drawVisualizer(outputAnalyserRef.current, canvasCtx, outputVisualizerRef.current, '#19c2ff');
            }
            animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
    }, []);

    const stopVisualizers = useCallback(() => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        [inputVisualizerRef, outputVisualizerRef].forEach(ref => {
            if (ref.current) {
                const canvasCtx = ref.current.getContext('2d');
                canvasCtx?.clearRect(0, 0, ref.current.width, ref.current.height);
            }
        });
    }, []);
    
    const handleConnect = useCallback(async () => {
        if ((callStatus !== 'idle' && callStatus !== 'ended') || !selectedAgent) return;

        setCallStatus('connecting');
        setTranscript([]);
        addTranscriptLine('System', 'Connecting...');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            if (!process.env.API_KEY) {
              addTranscriptLine('System', 'API_KEY environment variable not set.');
              setCallStatus('ended');
              return;
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            inputAnalyserRef.current = inputAudioContextRef.current.createAnalyser();
            inputAnalyserRef.current.fftSize = 256;
            outputAnalyserRef.current = outputAudioContextRef.current.createAnalyser();
            outputAnalyserRef.current.fftSize = 256;

            startVisualizers();

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setCallStatus('connected');
                        addTranscriptLine('System', 'Connected. You can start talking.');

                        if (!inputAudioContextRef.current || !mediaStreamRef.current || !inputAnalyserRef.current) return;
                        const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            if (isMuted) return;
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        
                        source.connect(inputAnalyserRef.current);
                        inputAnalyserRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                            const audioData = message.serverContent.modelTurn.parts[0].inlineData.data;
                            if (outputAudioContextRef.current && outputAnalyserRef.current) {
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                                const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                                const source = outputAudioContextRef.current.createBufferSource();
                                source.buffer = audioBuffer;
                                source.connect(outputAnalyserRef.current);
                                outputAnalyserRef.current.connect(outputAudioContextRef.current.destination);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += audioBuffer.duration;
                                audioSourcesRef.current.add(source);
                                source.onended = () => audioSourcesRef.current.delete(source);
                            }
                        }
                        if (message.serverContent?.interrupted) {
                            for (const source of audioSourcesRef.current) source.stop();
                            audioSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        let updated = false;
                        const currentTranscript = transcriptRef.current;
                        const process = (transcription: { text: string } | undefined, speaker: 'You' | 'Agent') => {
                            if (transcription?.text) {
                                const last = currentTranscript[currentTranscript.length - 1];
                                if (last?.speaker === speaker) last.text += transcription.text;
                                else currentTranscript.push({ speaker, text: transcription.text, timestamp: Date.now() });
                                updated = true;
                            }
                        };
                        process(message.serverContent?.inputTranscription, 'You');
                        process(message.serverContent?.outputTranscription, 'Agent');

                        if (updated) setTranscript([...currentTranscript]);
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        addTranscriptLine('System', `Error: ${e.message}`);
                        handleEndCall();
                    },
                    onclose: () => addTranscriptLine('System', 'Session closed.'),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_MAP[selectedAgent.voice] || 'Zephyr' } } },
                    systemInstruction: selectedAgent.persona,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                }
            });

            sessionRef.current = await sessionPromise;
        } catch (error) {
            console.error('Failed to start call:', error);
            addTranscriptLine('System', 'Failed to start call. Check permissions and console.');
            setCallStatus('ended');
            stopVisualizers();
        }
    }, [callStatus, isMuted, startVisualizers, stopVisualizers, selectedAgent]);

    const handleEndCall = useCallback(() => {
        sessionRef.current?.close();
        sessionRef.current = null;
        
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;

        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;

        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();

        stopVisualizers();
        setCallStatus('ended');
        addTranscriptLine('System', 'Call ended.');
    }, [stopVisualizers]);
    
    useEffect(() => {
      return () => {
        handleEndCall();
      }
    }, [handleEndCall]);

    const toggleMute = () => setIsMuted(prev => !prev);
    const handleDial = (digit: string) => setDialedNumber(prev => prev + digit);
    const handleDelete = () => setDialedNumber(prev => prev.slice(0, -1));
    const dialpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

    if (!selectedAgent) {
        return (
            <div className="p-6 flex flex-col h-full items-center justify-center text-center">
                <h1 className="text-xl font-semibold text-eburon-text mb-4">No Agent Selected</h1>
                <p className="text-eburon-muted max-w-sm">Please select an agent from the Agents page or Home page to start a test call.</p>
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col h-full">
            <h1 className="text-xl font-semibold text-eburon-text mb-4">Live Call Test: <span className="text-brand-teal font-bold">{selectedAgent.name}</span></h1>
            <div className="flex-1 bg-eburon-card border border-eburon-border rounded-xl p-4 flex flex-col space-y-4 overflow-hidden">
                <div className="flex-shrink-0 p-4">
                     <div className="h-10 text-center text-3xl font-light tracking-wider text-eburon-text">{dialedNumber || ' '}</div>
                </div>

                {callStatus === 'connected' || callStatus === 'ended' || callStatus === 'connecting' ? (
                     <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto pr-2">
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
                ) : (
                    <div className="grid grid-cols-3 gap-4 place-items-center p-4">
                        {dialpadKeys.map(key => <DialpadKey key={key} digit={key} onClick={handleDial}/>)}
                        <div></div>
                        <DialerButton className="bg-eburon-muted/10" onClick={handleDelete}><Delete size={32}/></DialerButton>
                    </div>
                )}
                
                 <div className="flex-shrink-0 flex justify-around items-center w-full p-4 border-t border-eburon-border">
                    <div className="text-center w-40">
                        <canvas ref={inputVisualizerRef} width="150" height="40" />
                        <p className="text-xs text-eburon-muted mt-1">Your Input</p>
                    </div>
                    
                    <div className="flex justify-center items-center space-x-6">
                        <DialerButton className="bg-eburon-muted/20 text-eburon-muted"><Volume2 size={32}/></DialerButton>
                        {callStatus === 'idle' || callStatus === 'ended' ? (
                            <DialerButton className="bg-ok/80 hover:bg-ok text-white" onClick={handleConnect}>
                                <Phone size={32}/>
                            </DialerButton>
                        ) : (
                            <DialerButton className="bg-danger/80 hover:bg-danger text-white" onClick={handleEndCall}>
                                <Phone size={32}/>
                            </DialerButton>
                        )}
                        <DialerButton className={`transition-colors ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-eburon-muted/20 text-eburon-muted'}`} onClick={toggleMute}>
                            {isMuted ? <MicOff size={32}/> : <Mic size={32}/>}
                        </DialerButton>
                    </div>

                    <div className="text-center w-40">
                        <canvas ref={outputVisualizerRef} width="150" height="40" />
                        <p className="text-xs text-eburon-muted mt-1">Agent Output</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CallsPage;