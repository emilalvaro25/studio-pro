import React, { useState, createContext, useContext, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { LeftNav } from './components/LeftNav';
import { RightPanel } from './components/RightPanel';
import { Agent, View, AgentVersion, CallRecord, Notification, NotificationType, Theme, KnowledgeBase, TemplateAgent } from './types';
import { X, CheckCircle, XCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';

// Lazy load page components for better performance
const HomePage = lazy(() => import('./pages/Home'));
const AgentsListPage = lazy(() => import('./pages/AgentsList'));
const KnowledgePage = lazy(() => import('./pages/Knowledge'));
const VoicesPage = lazy(() => import('./pages/Voices'));
const DeployPage = lazy(() => import('./pages/Deploy'));
const AgentBuilderPage = lazy(() => import('./pages/ImageGenerator'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const CallHistoryPage = lazy(() => import('./pages/CallHistory'));
const DatabasePage = lazy(() => import('./pages/Database'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const TemplatesPage = lazy(() => import('./pages/Templates'));
const IntegrationsPage = lazy(() => import('./pages/Integrations'));
const AgentVersionsModal = lazy(() => import('./components/AgentVersionsModal'));


// --- Supabase Client Singleton ---
const getSupabaseClient = (): SupabaseClient | null => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (url && key) {
        return createClient(url, key);
    }
    console.warn("Supabase credentials not found. The application will run in offline demo mode.");
    return null;
};
const supabase = getSupabaseClient();


// --- Data Mapping Helpers ---
const dbToAgent = (dbData: any): Omit<Agent, 'history'> => ({
    id: dbData.id,
    name: dbData.name,
    status: dbData.status,
    language: dbData.language,
    voice: dbData.voice,
    voiceDescription: dbData.voice_description,
    updatedAt: new Date(dbData.updated_at).toLocaleString(),
    personaShortText: dbData.persona_short_text,
    persona: dbData.persona,
    tools: dbData.tools || [],
    introSpiel: dbData.intro_spiel || { type: 'Concise' },
});

const agentToDb = (agent: Omit<Agent, 'history' | 'id'> & { id?: string }) => ({
    name: agent.name,
    status: agent.status,
    language: agent.language,
    voice: agent.voice,
    voice_description: agent.voiceDescription,
    persona_short_text: agent.personaShortText,
    persona: agent.persona,
    tools: agent.tools,
    intro_spiel: agent.introSpiel,
});

const dbToVersion = (dbData: any): AgentVersion => ({
    id: dbData.id,
    versionNumber: dbData.version_number,
    createdAt: new Date(dbData.created_at).toLocaleString(),
    description: dbData.description,
    name: dbData.name,
    status: dbData.status,
    language: dbData.language,
    voice: dbData.voice,
    voiceDescription: dbData.voice_description,
    personaShortText: dbData.persona_short_text,
    persona: dbData.persona,
    tools: dbData.tools || [],
    introSpiel: dbData.intro_spiel || { type: 'Concise' },
});

const dbToKb = (dbData: any): KnowledgeBase => ({
    id: dbData.id,
    sourceName: dbData.source_name,
    storagePath: dbData.storage_path,
    chunks: dbData.chunks,
    status: dbData.status,
    updatedAt: new Date(dbData.updated_at).toLocaleString(),
});

// --- Notification Component ---
const ICONS: { [key in NotificationType]: React.ReactNode } = {
    success: <CheckCircle className="text-ok" size={20} />,
    error: <XCircle className="text-danger" size={20} />,
    info: <Info className="text-primary" size={20} />,
    warn: <AlertTriangle className="text-warn" size={20} />,
};

const BORDER_COLORS: { [key in NotificationType]: string } = {
    success: 'border-ok/30',
    error: 'border-danger/30',
    info: 'border-primary/30',
    warn: 'border-warn/30',
};

const NotificationContainer: React.FC = () => {
    const { notifications, removeNotification } = useAppContext();

    if (notifications.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 right-6 z-[100] w-full max-w-sm space-y-3">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`bg-surface border ${BORDER_COLORS[notification.type]} rounded-xl shadow-lg p-4 flex items-start space-x-3 backdrop-blur-sm bg-opacity-80`}
                >
                    <div className="flex-shrink-0 pt-0.5">{ICONS[notification.type]}</div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text">{notification.message}</p>
                    </div>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="text-subtle hover:text-text"
                    >
                        <X size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
};
// --- End Notification Component ---


interface AppContextType {
  view: View;
  setView: (view: View) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  isQuickCreateOpen: boolean;
  setIsQuickCreateOpen: (isOpen: boolean) => void;
  handleStartTest: (agent: Agent) => void;
  versioningAgent: { agent: Agent; builderState?: Agent; } | null;
  setVersioningAgent: (data: { agent: Agent; builderState?: Agent; } | null) => void;
  saveAgentVersion: (agentId: string, description: string, stateToSave: Agent) => Promise<void>;
  restoreAgentVersion: (agentId: string, versionId: string) => Promise<void>;
  callHistory: CallRecord[];
  addCallToHistory: (call: CallRecord) => Promise<void>;
  notifications: Notification[];
  addNotification: (message: string, type?: NotificationType) => void;
  removeNotification: (id: number) => void;
  updateAgent: (agent: Agent) => Promise<boolean>;
  deleteAgent: (agentId: string) => Promise<void>;
  cloneAgent: (agent: Agent) => Promise<void>;
  createAgent: (agentData: Omit<Agent, 'id' | 'history' | 'updatedAt' | 'status'>, fromTemplate?: boolean) => Promise<void>;
  isSupabaseConnected: boolean;
  isLeftNavOpen: boolean;
  setIsLeftNavOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRightPanelOpen: boolean;
  setIsRightPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  session: Session | null;
  user: User | null;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  knowledgeBases: KnowledgeBase[];
  uploadKnowledgeFile: (file: File) => Promise<void>;
  deleteKnowledgeBase: (kb: KnowledgeBase) => Promise<void>;
  supabase: SupabaseClient | null;
  isDemoMode: boolean;
  startInSimulationMode: boolean;
  setStartInSimulationMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const createSystemPrompt = (agentName: string, companyName: string, voiceDescription: string): string => {
    // The voiceDescription parameter is kept for function signature compatibility,
    // but the new prompt template contains its own detailed voice and tone section.
    return `SYSTEM PROMPT — ${agentName.toUpperCase()} (${companyName.toUpperCase()} CUSTOMER SERVICE REPRESENTATIVE)

ROLE & BRAND
You are **${agentName}**, an expert Customer Service Representative for **${companyName}**. You embody world-class hospitality, efficiency, and professionalism. You sound human and trustworthy—never robotic. Your goal is to make every passenger feel heard, valued, and taken care of, regardless of the situation.

PRIMARY OBJECTIVE
Resolve the customer’s need quickly and accurately while preserving ${companyName}’s premium experience:
1) Acknowledge & empathize → 2) Verify & clarify → 3) Solve or propose best option → 4) Confirm next steps in writing → 5) Close warmly.

———
VOICE & TONE

Default Tone
- Warm, clear, professional, consistently reassuring.
- Pleasant medium pitch with light international polish (global brand image).

Cadence & Pacing
- Speak at a steady, slightly brisk CSR pace (~1.3–1.4×), without rushing.
- Slow slightly for bad news or when explaining procedures.
- Respect punctuation: commas = short pause, periods = normal pause, new lines = clear separation. Never run sentences together.

Emotional Adjustments
- Angry customer → you become calmer, warmer, slower, steady.
- Anxious/confused → simplify, add pauses, reassure step-by-step.
- Neutral/polite → lightly upbeat, efficient.
- Happy → warm, positive inflection, polite enthusiasm.

Empathy & Ownership
- Empathy first: acknowledge feelings before solutions.
- Ownership language: “Here’s what we can do…”, not “You should…”
- Active listening markers: “I see,” “Of course,” “I understand,” “Thank you for your patience.”

Polite Light Humor (rare, appropriate)
- Example if they apologize for being upset: “That’s perfectly okay—my coffee machine hears worse every morning.” (gentle, brief)

———
CANONICAL PHRASES (USE WHEN NATURAL)
- “Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?”
- “Of course, I can certainly help you with that.”
- “I understand how frustrating this must be.”
- “Here is what we can do for you…”
- “One moment please, while I check that information.”
- “Thank you for your patience.”
- “I’ll take care of this for you right away.”
- “We truly appreciate your loyalty to ${companyName}.”

Closing (always)
- “Thank you for flying with ${companyName}. We wish you a pleasant journey and a wonderful day.”

———
OPERATIONAL GUARDRAILS

Identity & Confidentiality
- Never disclose internal tools, systems, vendor names, or backend details.
- Do not speculate. If uncertain, say you’ll check, then return with a precise answer.
- Never share personal data beyond what the customer already provided. Mask sensitive details where applicable.

Verification (Apply when accessing/altering bookings, accounts, billing)
- Collect: full name on booking, PNR (booking reference), email or phone on file.
- For Miles&Smiles: membership number + name match.
- For billing: last 4 digits of card and transaction date/amount.
- If mismatch: explain gently and offer secure verification steps or direct channel.

On-Hold Etiquette
- Ask permission to place on hold (~60–120 seconds).
- Offer callback if hold exceeds reasonable time.
- Return with a brief status summary and next action.

Policy / Bad News Delivery
- Be neutral, steady, never defensive.
- Soften with empathy: “I understand this isn’t the news you were hoping for. Here is the best solution available…”
- Present options clearly (costs, timelines, eligibility). Confirm the customer’s choice.

Escalation
- Escalate if: safety/security concerns, repeated system failures, suspected fraud, or when policy permits an exception.
- Maintain ownership: “I’ll escalate this for you and remain your point of contact until we have a resolution.”

Proactive Confirmation
- After any change, clearly restate: flight number, route, date/time, seat, baggage, fees/credits, refund timelines.
- Offer written confirmation via email/SMS when available.

Terminology (use correctly)
- “Booking reference” / “PNR”
- “Miles&Smiles account”
- “Layover” / “Connection”
- “Baggage allowance”
- “Upgrade eligibility”

———
TYPICAL DATA POINTS TO COLLECT (ASK ONLY WHAT’S NEEDED)
- Identity: name as on booking, PNR, contact email/phone.
- Trip: origin, destination, dates, flight numbers.
- Baggage: tag number(s), last seen location, delivery address.
- Billing: last 4 digits, date/amount, channel (web/app/desk).
- Loyalty: Miles&Smiles number.

———
DO / DON’T

DO
- Lead with empathy, follow with solutions.
- Summarize options with clear pros/cons.
- Confirm next steps with timing (“within 24 hours,” “on the next flight,” “refund in 3–5 business days”).
- Offer written confirmation when possible.

DON’T
- Don’t sound scripted or robotic.
- Don’t blame the customer or other departments.
- Don’t overpromise; never give timelines you can’t stand behind.
- Don’t reveal internal processes or vendor names.

———
GREETING (ALWAYS)
“Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?”

———
SAMPLE CONVERSATIONS (10 FULL EXAMPLES)

Conversation 1 — Airline Lost Baggage
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?
Customer: I just landed in Istanbul, but my luggage didn’t arrive. I’m panicking—I have an important meeting tomorrow.
${agentName}: I’m very sorry to hear about this, and I completely understand how stressful it is. Let’s resolve this together. Could you please provide me with your baggage tag number from check-in?
Customer: Yes, it’s TK49203.
${agentName}: Thank you. One moment, please, while I track this in our baggage system… Okay, I see here your bag was delayed in Frankfurt but is scheduled to arrive on the next flight in about six hours. We will deliver it directly to your hotel tonight. May I confirm your hotel address so our courier can bring it to you as soon as it arrives?
Customer: Yes, I’m at the Hilton Bosphorus.
${agentName}: Perfect. I’ll register this delivery now. I’ll also give you a case reference number so you can check the status anytime. In the meantime, please keep receipts for any essentials you need to purchase, as you may be reimbursed. You’re not alone in this—we’ll make sure it’s taken care of.

Conversation 2 — Flight Delay & Missed Connection
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?
Customer: My flight from Paris was delayed, and now I missed my connection to Bangkok. What am I supposed to do now?
${agentName}: I’m very sorry about this disruption. Let’s look at the next available connection for you. Could you provide your booking reference, please?
Customer: Yes, it’s 6RT921.
${agentName}: Thank you. Checking now… I see you missed TK64 to Bangkok. Don’t worry—we’ve already rebooked you on the next available flight departing tonight at 23:45. You’ll also be eligible for a meal voucher during your wait. Would you prefer a lounge pass instead?
Customer: Oh, lounge would be better, thank you.
${agentName}: Absolutely. I’ll issue a lounge invitation for you right away. You’ll receive it by email and at the transfer desk. Again, I apologize for the delay, but I want to ensure you’re as comfortable as possible while you wait.

Conversation 3 — Seat Upgrade with Miles&Smiles
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?
Customer: I want to use my Miles&Smiles points to upgrade from economy to business on my flight to New York. Is that possible?
${agentName}: Of course, I’d be happy to check that for you. May I have your booking reference and Miles&Smiles membership number?
Customer: Sure, booking is ABX391 and Miles number is 6002413.
${agentName}: Thank you. Checking availability… Yes, we have upgrade seats available on your flight. The cost is 45,000 Miles. Would you like me to process this now?
Customer: Yes, please.
${agentName}: Done. Your seat is now upgraded to Business Class, seat 3A. You’ll enjoy full-flat seating and lounge access before departure. Thank you for being a valued Miles&Smiles member.

Conversation 4 — General CSR: Billing Issue
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I assist you today?
Customer: Actually this isn’t about a flight, it’s about a charge I see on my card from your website. I think I was double charged for my ticket.
${agentName}: I’m sorry for the confusion. Let me check the transaction records. May I have your booking reference and the last four digits of the card you used?
Customer: Sure, it’s 4PL992 and card ending in 4561.
${agentName}: Thank you. Looking at the system, I can confirm there were two transactions attempted, but only one was captured. The other was a pre-authorization that will drop off within 3–5 business days. You won’t be charged twice. I’ll also email you this confirmation for your peace of mind.
Customer: That helps a lot, thank you.
${agentName}: You’re welcome. I understand billing issues can be worrying, and I’m glad we could clarify this quickly.

Conversation 5 — General CSR: Website Error & Refund
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How can I help you today?
Customer: I tried booking online, but after I paid, the website crashed. I didn’t get a ticket, but the money was taken.
${agentName}: I’m very sorry this happened—it must be frustrating. Let’s fix this right away. May I have your email address or PNR, if you received one?
Customer: No PNR, but my email is john.doe@gmail.com.
${agentName}: Thank you. Checking our backend now… I can see the transaction was captured, but no ticket was issued. I will initiate a manual issuance for you or, if you prefer, process a full refund. Which would you prefer?
Customer: Please issue the ticket.
${agentName}: Certainly. I’ll finalize this within the next 10 minutes and send the confirmation to your email. If anything goes wrong, I’ll follow up personally. Thank you for your patience.

Conversation 6 — Baggage Allowance Confusion
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help?
Customer: I’m confused about my baggage allowance. My ticket says two pieces, but the website said one.
${agentName}: I understand how confusing that must be. Let me check your booking class. Could you provide your reference code?
Customer: Yes, it’s PNR 4QJZ2.
${agentName}: Thank you. I confirm your ticket includes two checked bags up to 23kg each. The website you saw likely referred to a different fare class. You’re entitled to two, and I’ll send you a written confirmation now.
Customer: That’s a relief.
${agentName}: I’m glad we could clear that up. No need to worry at check-in—you’re all set.

Conversation 7 — Missed Check-in Window
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I assist?
Customer: I missed online check-in and now I’m worried I lost my seat.
${agentName}: Don’t worry, your booking is still valid. You’ll just need to check in at the airport counter. Your seat selection is still confirmed. May I email you your booking details for reassurance?
Customer: Yes, please.
${agentName}: Done. You’re all set.

Conversation 8 — Subscription Service: Cancellation
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?
Customer: Hi, I subscribed to inflight WiFi on my last flight but got charged again. I didn’t want a recurring subscription.
${agentName}: I apologize for the confusion. Let’s resolve this. Could you share your email ID so I can locate the subscription?
Customer: Sure, it’s mike.smith@gmail.com.
${agentName}: Thank you. I see you were accidentally enrolled in recurring billing. I’ll cancel this immediately and issue a refund for the extra charge. You’ll see it on your card within 5–7 business days. I’m sorry for the inconvenience.
Customer: Thanks, that helps.
${agentName}: You’re most welcome. We value your loyalty.

Conversation 9 — Overbooking Situation
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help?
Customer: I just got a message saying my flight is overbooked. Am I going to be denied boarding?
${agentName}: I understand your concern. Let’s check. Please give me your booking reference.
Customer: It’s 2JH84.
${agentName}: Thank you. I see that your flight is indeed overbooked, but you currently still hold a confirmed seat. To reassure you, we’re also offering volunteers compensation if they choose to rebook. If you prefer to secure an alternative flight now, I can help with that too. Would you like me to explore that?
Customer: Yes, please check options.
${agentName}: Certainly. Let’s look together. You’re my priority here.

Conversation 10 — Loyalty Account Issue
Agent (${agentName}): Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?
Customer: My Miles&Smiles account isn’t showing the miles from my last two flights.
${agentName}: I’m sorry for the inconvenience. Could you provide your membership number and flight details?
Customer: Yes, 6002413 and flights TK10 and TK92.
${agentName}: Thank you. Checking now… I see the miles haven’t posted due to a mismatch with your booking name format. I’ll fix this manually and credit the missing miles within 24 hours. I’ll also send a confirmation email once it’s done.
Customer: Thank you so much.
${agentName}: My pleasure. We deeply appreciate your loyalty.

———
FINAL REMINDER
- Always greet with: “Thank you for calling ${companyName}. My name is ${agentName}. How may I help you today?”
- Always close with: “Thank you for flying with ${companyName}. We wish you a pleasant journey and a wonderful day.”
- Lead with empathy, verify carefully, offer clear options, confirm in writing, and close warmly.`;
};

export type Department = 'Booking' | 'Refunds' | 'Complaints' | 'Special Needs' | 'Other' | 'General';

export const getDepartmentalPrompt = (department: Department, agentName: string, companyName: string, voiceDescription: string): string => {
    const basePrompt = createSystemPrompt(agentName, companyName, voiceDescription);
    let departmentSpecifics = '';
    switch(department) {
        case 'Booking':
            departmentSpecifics = 'You are now handling new bookings. Be proactive, suggest upgrades, and confirm details meticulously. Your goal is to secure the booking efficiently and provide a premium experience.';
            break;
        case 'Refunds':
            departmentSpecifics = 'You are handling cancellations and refunds. Be empathetic and clear about the process, policies, and timelines. Accuracy is critical.';
            break;
        case 'Complaints':
            departmentSpecifics = 'You are a de-escalation specialist handling complaints. Use your core training to listen carefully, validate feelings, and find a resolution. Your primary goal is to retain the customer.';
            break;
        case 'Special Needs':
            departmentSpecifics = 'You are assisting customers with special assistance requests. Be patient, thorough, and extremely clear. Double-check all arrangements and confirm with the customer.';
            break;
        case 'General':
            departmentSpecifics = 'You are a general support representative. Your goal is to understand the customer\'s need and provide immediate assistance or route them to the correct department efficiently.';
            break;
        case 'Other':
        default:
            departmentSpecifics = 'You are handling a specialized inquiry. Use your core training to assist the customer effectively.';
            break;
    }
    return `${basePrompt}\n\n———\nCURRENT DIRECTIVE\nYour current specialization is: ${departmentSpecifics} Address the customer's needs accordingly.`;
};

const PageLoader: React.FC = () => (
    <div className="flex-1 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
    </div>
);


const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [view, setView] = useState<View>('Home');
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
    const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
    const [versioningAgent, setVersioningAgent] = useState<{ agent: Agent; builderState?: Agent; } | null>(null);
    const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
    const [newAgentName, setNewAgentName] = useState('');
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isSupabaseConnected = !!supabase;
    const [isLeftNavOpen, setIsLeftNavOpen] = useState(window.innerWidth > 1024);
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(window.innerWidth > 1024);
    const [theme, rawSetTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    const [startInSimulationMode, setStartInSimulationMode] = useState(false);

    const setTheme = (newTheme: Theme) => {
        rawSetTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    };

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            removeNotification(id);
        }, 5000);
    }, [removeNotification]);

    useEffect(() => {
        setIsLoading(true);
        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                if (_event === 'INITIAL_SESSION' && !session) {
                    const { data: anonData, error } = await supabase.auth.signInAnonymously();
                    if (error) {
                        console.warn("Anonymous sign-in error:", error.message, "Entering demo mode.");
                        addNotification("Could not connect to backend. Running in offline demo mode. Your work will not be saved.", "warn");
                        setIsDemoMode(true);
                        setSession(null);
                        setUser(null);
                    } else if (anonData.session) {
                        setSession(anonData.session);
                        setUser(anonData.user);
                    }
                } else {
                    setSession(session);
                    setUser(session?.user ?? null);
                }
                setIsLoading(false);
            });
    
            return () => subscription.unsubscribe();
        } else {
            // If supabase client failed to initialize, go straight to demo mode.
            addNotification("Supabase not configured. Running in offline demo mode.", "warn");
            setIsDemoMode(true);
            setIsLoading(false);
        }
    }, [addNotification]);

    useEffect(() => {
        const handleResize = () => {
            const isDesktop = window.innerWidth > 1024;
            if (!isDesktop) {
                setIsLeftNavOpen(false);
                setIsRightPanelOpen(false);
            } else {
                setIsLeftNavOpen(true);
                setIsRightPanelOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            if (!supabase) {
                addNotification('Supabase not configured.', 'warn');
                setIsLoading(false);
                return;
            }

            try {
                // Fetch agents, KBs, and call history in parallel
                const [agentsRes, kbsRes, callHistoryRes] = await Promise.all([
                    supabase.from('agents').select('*'),
                    supabase.from('knowledge_bases').select('*'),
                    supabase.from('call_history').select('*').order('start_time', { ascending: false }).limit(50)
                ]);

                const { data: agentsFromDb, error: agentsError } = agentsRes;
                if (agentsError) throw agentsError;

                if (agentsFromDb) {
                    const agentsWithHistory = await Promise.all(agentsFromDb.map(async (dbAgent) => {
                        const agent = dbToAgent(dbAgent);
                        const { data: versionsFromDb } = await supabase.from('agent_versions').select('*').eq('agent_id', agent.id);
                        return { ...agent, history: versionsFromDb ? versionsFromDb.map(dbToVersion) : [] };
                    }));
                    setAgents(agentsWithHistory);
                }

                const { data: kbsFromDb, error: kbsError } = kbsRes;
                if (kbsError) throw kbsError;
                if (kbsFromDb) {
                    setKnowledgeBases(kbsFromDb.map(dbToKb));
                }

                const { data: callHistoryFromDb, error: callHistoryError } = callHistoryRes;
                if (callHistoryError) throw callHistoryError;
                if (callHistoryFromDb) {
                    setCallHistory(callHistoryFromDb.map((rec: any) => ({
                        ...rec,
                        startTime: Date.parse(rec.start_time),
                        endTime: Date.parse(rec.end_time),
                        duration: rec.duration_ms,
                        recordingUrl: rec.recording_url,
                    })));
                }

            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown database error";
                addNotification(`Failed to load data: ${message}`, 'error');
            } finally {
                setIsLoading(false);
            }
        };
        
        if (isDemoMode) {
            setIsLoading(true);
            const demoTemplate: TemplateAgent = { name: 'Turkish Airlines Reservations', company: 'Turkish Airlines', category: 'Travel', language: 'Multilingual', voice: 'Amber', voiceDescription: 'Warm, welcoming, and professional, with a hint of an international accent.', personaShortText: 'Manages flight bookings, changes, and provides flight information.', tools: ['Calendar', 'Webhook'], introSpiel: { type: 'Warm' }, persona: '' };
            const persona = createSystemPrompt(demoTemplate.name, demoTemplate.company, demoTemplate.voiceDescription);
            const demoAgent: Agent = {
                id: 'demo-agent-1',
                name: demoTemplate.name,
                status: 'Ready',
                updatedAt: new Date().toLocaleString(),
                history: [],
                ...demoTemplate,
                persona,
            };
            setAgents([demoAgent]);
            setKnowledgeBases([]);
            setCallHistory([]);
            setIsLoading(false);
        } else if (session) {
            loadData();
        }
    }, [session, isDemoMode, addNotification]);

    useEffect(() => {
        if (!selectedAgent && agents.length > 0) {
            setSelectedAgent(agents[0]);
        }
    }, [agents, selectedAgent]);

    const handleStartTest = (agent: Agent) => {
        setSelectedAgent(agent);
        setStartInSimulationMode(true);
        setView('Calls');
    };

    const updateAgent = useCallback(async (agentToUpdate: Agent): Promise<boolean> => {
        if (isDemoMode) {
            setAgents(prev => prev.map(a => a.id === agentToUpdate.id ? agentToUpdate : a));
            if (selectedAgent?.id === agentToUpdate.id) setSelectedAgent(agentToUpdate);
            addNotification('Agent updated in demo mode. Changes are temporary.', 'info');
            return true;
        }
        if (!supabase) { addNotification('Supabase not configured.', 'error'); return false; }
        try {
            const { history, ...agentData } = agentToUpdate;
            const dbAgent = agentToDb(agentData);
            const { error } = await supabase.from('agents').update(dbAgent).eq('id', agentData.id);
            if (error) throw error;
            setAgents(prev => prev.map(a => a.id === agentToUpdate.id ? agentToUpdate : a));
            if (selectedAgent?.id === agentToUpdate.id) setSelectedAgent(agentToUpdate);
            return true;
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to save agent: ${message}`, 'error');
            return false;
        }
    }, [addNotification, selectedAgent?.id, isDemoMode]);
    
    const deleteAgent = useCallback(async (agentId: string) => {
        const deletedAgentName = agents.find(a => a.id === agentId)?.name || 'Agent';
        const remainingAgents = agents.filter(a => a.id !== agentId);
        
        if (isDemoMode) {
            setAgents(remainingAgents);
            if (selectedAgent?.id === agentId) setSelectedAgent(remainingAgents.length > 0 ? remainingAgents[0] : null);
            addNotification(`Agent "${deletedAgentName}" deleted in demo mode.`, 'info');
            return;
        }

        if (!supabase) { addNotification('Supabase not configured.', 'error'); return; }
        try {
            const { error } = await supabase.from('agents').delete().eq('id', agentId);
            if (error) throw error;
            
            setAgents(remainingAgents);
            if (selectedAgent?.id === agentId) setSelectedAgent(remainingAgents.length > 0 ? remainingAgents[0] : null);
            addNotification(`Agent "${deletedAgentName}" deleted.`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to delete agent: ${message}`, 'error');
        }
    }, [addNotification, agents, selectedAgent?.id, isDemoMode]);
    
    const cloneAgent = useCallback(async (agentToClone: Agent) => {
        const { id, history, name, ...restOfAgent } = agentToClone;
        const clonedAgentData = { ...restOfAgent, name: `${name} - Clone`, status: 'Draft' as const };
        
        if (isDemoMode) {
            const newAgent: Agent = { ...clonedAgentData, id: `demo-agent-${Date.now()}`, history: [], updatedAt: new Date().toLocaleString() };
            setAgents(prev => [newAgent, ...prev]);
            setSelectedAgent(newAgent);
            addNotification(`Agent "${newAgent.name}" created from clone in demo mode.`, 'info');
            return;
        }

        if (!supabase || !user) { addNotification('Supabase not configured or user not found.', 'error'); return; }
        try {
            const { data, error } = await supabase.from('agents').insert({ ...agentToDb(clonedAgentData), user_id: user.id }).select();
            if (error) throw error;
            const newAgent: Agent = { ...dbToAgent(data[0]), history: [] };
            setAgents(prev => [newAgent, ...prev]);
            setSelectedAgent(newAgent);
            addNotification(`Agent "${newAgent.name}" created from clone.`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to clone agent: ${message}`, 'error');
        }
    }, [addNotification, user, isDemoMode]);

    const saveAgentVersion = async (agentId: string, description: string, stateToSave: Agent) => {
         if (isDemoMode) {
            addNotification('Versioning is disabled in demo mode.', 'warn');
            return;
        }
        if (!supabase) { addNotification('Supabase not configured.', 'error'); return; }
        try {
            const agent = agents.find(a => a.id === agentId);
            if (!agent) throw new Error("Agent not found");
            const newVersionNumber = (agent.history[agent.history.length - 1]?.versionNumber || 0) + 1;
            const { history, ...versionData } = stateToSave;
            const versionToDb = { ...agentToDb(versionData), agent_id: agentId, version_number: newVersionNumber, description };
            const { data, error } = await supabase.from('agent_versions').insert(versionToDb).select();
            if (error) throw error;
            const newVersion = dbToVersion(data[0]);
            setAgents(prev => prev.map(a => a.id === agentId ? { ...a, history: [...a.history, newVersion] } : a));
            addNotification(`Version "${description}" saved for ${stateToSave.name}.`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to save version: ${message}`, 'error');
        }
    };
    
    const restoreAgentVersion = async (agentId: string, versionId: string) => {
        if (isDemoMode) { addNotification('Versioning is disabled in demo mode.', 'warn'); return; }
        try {
            const agent = agents.find(a => a.id === agentId);
            const version = agent?.history.find(v => v.id === versionId);
            if (!agent || !version) throw new Error("Version not found");
            const { id, versionNumber, createdAt, description, ...versionData } = version;
            const updatedAgent: Agent = { ...agent, ...versionData, updatedAt: 'Just now' };
            const success = await updateAgent(updatedAgent);
            if (success) {
                addNotification(`Restored version for "${agent.name}".`, 'success');
                setView('Agents');
                setTimeout(() => setView('AgentBuilder'), 0);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to restore version: ${message}`, 'error');
        }
    };

    const addCallToHistory = async (call: CallRecord) => {
        if (isDemoMode) {
            setCallHistory(prev => [call, ...prev]);
            addNotification('Call record saved to temporary history.', 'info');
            return;
        }
        if (!supabase || !user) { addNotification('Supabase not configured. Call record not saved.', 'warn'); return; }
        try {
             const callToDb = {
                agent_id: call.agentId, agent_name: call.agentName, start_time: new Date(call.startTime).toISOString(),
                end_time: new Date(call.endTime).toISOString(), duration_ms: call.duration, transcript: call.transcript,
                recording_url: call.recordingUrl, user_id: user.id,
            };
            const { error } = await supabase.from('call_history').insert(callToDb);
            if (error) throw error;
            setCallHistory(prev => [call, ...prev]);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to save call record: ${message}`, 'error');
        }
    };

    const createAgent = async (agentData: Omit<Agent, 'id' | 'history' | 'updatedAt' | 'status'>, fromTemplate = false) => {
        const newAgentData = { ...agentData, status: 'Draft' as const, updatedAt: new Date().toLocaleString() };
        
        if (isDemoMode) {
            const newAgent: Agent = { ...newAgentData, id: `demo-agent-${Date.now()}`, history: [] };
            setAgents(prev => [newAgent, ...prev]);
            setSelectedAgent(newAgent);
            setNewAgentName('');
            if (isQuickCreateOpen) setIsQuickCreateOpen(false);
            setView('AgentBuilder');
            addNotification(`Agent "${newAgent.name}" created in demo mode.`, 'info');
            return;
        }

        if (!supabase || !user) { addNotification('Supabase not configured or user not found.', 'error'); return; }
        try {
            const { data, error } = await supabase.from('agents').insert({ ...agentToDb(newAgentData), user_id: user.id }).select();
            if (error) throw error;
            const newAgent: Agent = { ...dbToAgent(data[0]), history: [] };
            setAgents(prev => [newAgent, ...prev]);
            setSelectedAgent(newAgent);
            setNewAgentName('');
            if (isQuickCreateOpen) setIsQuickCreateOpen(false);
            setView('AgentBuilder');
            const message = fromTemplate ? `Agent "${newAgent.name}" created from template.` : `Agent "${newAgent.name}" created successfully.`;
            addNotification(message, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to create agent: ${message}`, 'error');
        }
    };

    const uploadKnowledgeFile = async (file: File) => {
        if (isDemoMode) { addNotification('File upload disabled in demo mode.', 'warn'); return; }
        if (!supabase || !user) { addNotification('Supabase not configured or user not found.', 'error'); return; }
        const filePath = `knowledge_files/${user.id}/${Date.now()}_${file.name}`;
        addNotification(`Uploading "${file.name}"...`, 'info');
        try {
            const { error: uploadError } = await supabase.storage.from('studio').upload(filePath, file);
            if (uploadError) throw uploadError;
            const newKbData = { user_id: user.id, source_name: file.name, storage_path: filePath, status: 'Indexing...' as const, chunks: null };
            const { data, error: insertError } = await supabase.from('knowledge_bases').insert(newKbData).select();
            if (insertError) throw insertError;
            const newKb = dbToKb(data[0]);
            setKnowledgeBases(prev => [newKb, ...prev]);
            setTimeout(async () => {
                const updatedKbData = { status: 'Indexed' as const, chunks: Math.floor(Math.random() * 200) + 50 };
                const { data: updatedData, error: updateError } = await supabase.from('knowledge_bases').update(updatedKbData).eq('id', newKb.id).select();
                if (updateError) throw updateError;
                setKnowledgeBases(prev => prev.map(kb => kb.id === newKb.id ? dbToKb(updatedData[0]) : kb));
                addNotification(`"${newKb.sourceName}" has been successfully indexed.`, 'success');
            }, 3000);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to upload file: ${message}`, 'error');
        }
    };

    const deleteKnowledgeBase = async (kb: KnowledgeBase) => {
        if (isDemoMode) { addNotification('KB management disabled in demo mode.', 'warn'); return; }
        if (!supabase) { addNotification('Supabase not configured.', 'error'); return; }
        try {
            const { error: storageError } = await supabase.storage.from('studio').remove([kb.storagePath]);
            if (storageError) console.warn('Storage deletion failed, but proceeding with DB deletion:', storageError.message);
            const { error: dbError } = await supabase.from('knowledge_bases').delete().eq('id', kb.id);
            if (dbError) throw dbError;
            setKnowledgeBases(prev => prev.filter(k => k.id !== kb.id));
            addNotification(`Knowledge base "${kb.sourceName}" deleted.`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            addNotification(`Failed to delete knowledge base: ${message}`, 'error');
        }
    };


    const handleCreateAgentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAgentName.trim()) return;
        const voiceDescription = "A standard, neutral voice.";
        const newAgentData = {
            name: newAgentName, language: 'Multilingual', voice: 'Amber', voiceDescription,
            personaShortText: `An AI assistant named ${newAgentName}.`,
            persona: getDepartmentalPrompt('General', newAgentName, "the company", voiceDescription),
            tools: [], introSpiel: { type: 'Concise' as const },
        };
        await createAgent(newAgentData);
    };

    const contextValue: AppContextType = useMemo(() => ({
        view, setView, selectedAgent, setSelectedAgent, agents, setAgents, isQuickCreateOpen, setIsQuickCreateOpen,
        handleStartTest, versioningAgent, setVersioningAgent, saveAgentVersion, restoreAgentVersion,
        callHistory, addCallToHistory, notifications, addNotification, removeNotification, updateAgent, deleteAgent,
        cloneAgent, createAgent, isSupabaseConnected, isLeftNavOpen, setIsLeftNavOpen, isRightPanelOpen, setIsRightPanelOpen,
        session, user, theme, setTheme, knowledgeBases, uploadKnowledgeFile, deleteKnowledgeBase, supabase, isDemoMode,
        startInSimulationMode, setStartInSimulationMode
    }), [view, selectedAgent, agents, isQuickCreateOpen, versioningAgent, callHistory, notifications, addNotification, removeNotification, updateAgent, deleteAgent, cloneAgent, createAgent, isSupabaseConnected, isLeftNavOpen, isRightPanelOpen, session, user, theme, knowledgeBases, isDemoMode, startInSimulationMode]);

    const renderView = () => {
        switch (view) {
            case 'Home': return <HomePage />;
            case 'Agents': return <AgentsListPage />;
            case 'Templates': return <TemplatesPage />;
            case 'Calls': return <CallHistoryPage />;
            case 'Knowledge': return <KnowledgePage />;
            case 'Voices': return <VoicesPage />;
            case 'Deploy': return <DeployPage />;
            case 'Integrations': return <IntegrationsPage />;
            case 'AgentBuilder': return <AgentBuilderPage />;
            case 'Settings': return <SettingsPage />;
            case 'Database': return <DatabasePage />;
            case 'Profile': return <ProfilePage />;
            default: return <HomePage />;
        }
    };
    
    if (isLoading) {
        return (
            <div className="bg-background h-screen w-screen flex flex-col items-center justify-center text-subtle">
                <Loader2 size={48} className="animate-spin text-primary" />
                <p className="mt-4 text-lg">Initializing Studio...</p>
            </div>
        );
    }

    return (
        <AppContext.Provider value={contextValue}>
            <div className="bg-background text-text font-sans h-screen w-screen flex flex-col overflow-hidden">
                <div className="auth-waves fixed inset-0 z-0">
                    <div className="wave wave1" />
                    <div className="wave wave2" />
                </div>
                
                <div className="relative z-10 flex flex-col h-full bg-transparent">
                    <Header />
                    <div className="flex flex-1 min-h-0 relative">
                        <LeftNav />
                        <main className="flex-1 overflow-y-auto bg-transparent flex">
                            <Suspense fallback={<PageLoader />}>
                                {renderView()}
                            </Suspense>
                        </main>
                        <RightPanel />
                        {(isLeftNavOpen || isRightPanelOpen) && ! (window.innerWidth > 1024) && (
                            <div 
                                className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
                                onClick={() => {
                                    setIsLeftNavOpen(false);
                                    setIsRightPanelOpen(false);
                                }}
                            />
                        )}
                    </div>
                </div>
            </div>
            <Suspense>
                {versioningAgent && <AgentVersionsModal data={versioningAgent} onClose={() => setVersioningAgent(null)} />}
            </Suspense>
            {isQuickCreateOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm" onClick={() => setIsQuickCreateOpen(false)}>
                    <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Create New Agent</h2>
                            <button onClick={() => setIsQuickCreateOpen(false)}><X size={20} className="text-subtle hover:text-text"/></button>
                        </div>
                        <form onSubmit={handleCreateAgentSubmit}>
                            <label htmlFor="newAgentName" className="block text-sm font-medium text-subtle mb-2">Agent Name</label>
                            <input
                                id="newAgentName"
                                type="text"
                                value={newAgentName}
                                onChange={e => setNewAgentName(e.target.value)}
                                placeholder="e.g., Banking Support Bot"
                                className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                            <div className="mt-6 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsQuickCreateOpen(false)} className="px-4 py-2 rounded-lg bg-panel hover:bg-border">Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:opacity-90 disabled:opacity-50" disabled={!newAgentName.trim()}>Create Agent</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <NotificationContainer />
        </AppContext.Provider>
    );
};

export default App;