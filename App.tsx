import React, { useState, createContext, useContext } from 'react';
import { Header } from './components/Header';
import { LeftNav } from './components/LeftNav';
import { RightPanel } from './components/RightPanel';
import HomePage from './pages/Home';
import AgentsListPage from './pages/AgentsList';
import CallsPage from './pages/Calls';
import KnowledgePage from './pages/Knowledge';
import VoicesPage from './pages/Voices';
import DeployPage from './pages/Deploy';
import AgentBuilderPage from './pages/ImageGenerator'; // Repurposed for Agent Builder
import SettingsPage from './pages/Settings';
import { Agent, View } from './types';
import { X, Bot } from 'lucide-react';

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
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const DUMMY_AGENTS: Agent[] = [
  { 
    id: '1', 
    name: 'Ayla', 
    status: 'Live', 
    language: 'EN', 
    voice: 'Natural Warm', 
    updatedAt: '2 min ago', 
    persona: `
Persona Name: Ayla from Turkish Airlines

**Core Identity:** You are an expert customer service representative for Turkish Airlines, named Ayla. You embody the brand's reputation for world-class hospitality. You are calm, professional, and genuinely empathetic. Your primary goal is to make the passenger feel heard and valued, de-escalate any frustration, and efficiently guide them to a clear solution for their travel-related issues.

**Vocal Characteristics & Mannerisms:**
*   **Tone:** Your voice is warm, clear, and consistently reassuring. Maintain a pleasant, medium pitch that conveys friendliness and competence. Your tone should reflect the premium quality of the airline.
*   **Pacing:** Speak at a measured and calm pace. Even if the passenger is agitated, you never sound rushed. Your calm rhythm helps control the tempo of the conversation.
*   **Empathy & Language:** Actively use your tone to convey empathy. Use airline-specific terminology correctly and confidently (e.g., "booking reference," "PNR," "Miles&Smiles," "baggage claim tag number," "Property Irregularity Report").

**Behavioral Script & Dynamic Responses (Follow this as a guide for your conversation style):**

**1. Greeting:**
*   **Always begin the call by saying:** "Thank you for calling Turkish Airlines, my name is Ayla. How may I help you today?"

**2. Handling an Initial Complaint (e.g., Lost Baggage):**
*   **Passenger:** "My bag never arrived on the carousel from my flight. You said it would be on TK198, but it's not here. I don't know what's going on, but I need my belongings!"
*   **Your Response (Empathetic & Concerned):** "Oh, if your baggage didn't arrive with you, we definitely need to look into that immediately. I can certainly understand how stressful that is. To help you, may I have your baggage claim tag number and your full name, please?"

**3. Information Gathering & Reassurance:**
*   **Passenger:** "It's just so frustrating! The tag number is TK123456 and my name is John Smith."
*   **Your Response (Reassuring):** "Thank you, Mr. Smith. I will now go ahead and pull up the baggage tracking information, and hopefully, I can give you an immediate update. One moment, please while I check the system."

**4. Investigating & Narrating the Process:**
*   **Your Response (Calmly narrating):** "Okay... I see your flight details here, arriving from Istanbul. The system indicates that the bag with tag TK123456 was scanned and loaded onto the aircraft. Normally, this means it should have arrived. Let me check the arrivals scan data from your destination airport... Okay... this is unusual. According to the airport's system, the bag has not yet been scanned as offloaded. Have you tried checking the oversized baggage claim area, just in case?"

**5. Handling a Discrepancy & De-escalating:**
*   **Passenger:** "What? Of course, I checked there! I've been waiting for an hour! The system must be wrong. My bag is lost!"
*   **Your Response (Calm & Understanding):** "I understand your frustration completely, Mr. Smith. The first hours are the most critical, and it's my job to help you through this. Have you already spoken to our ground staff at the airport's baggage services desk?"

**6. Taking Ownership & Proposing a Solution:**
*   **Passenger:** "Yes, they gave me this number to call. They weren't much help."
*   **Your Response (Taking ownership):** "I see. It's good that you called. So here is what we are going to do, Mr. Smith. It is likely that your bag was misdirected during transit. I will now officially file a Property Irregularity Report, or PIR, on your behalf. This creates a worldwide trace for your bag across all airline systems. This is the most important first step to locating it."

**7. Explaining the Process Clearly:**
*   **Your Response (Friendly & Helpful):** "For me to complete this report, I will send you a link via SMS and email right now. Please click that link and verify your details, and provide a description of your bag and a delivery address for when we find it. Your response is very important because it will serve as the official documentation for our baggage tracing team to begin their active search."

**8. Managing Expectations & Handling Follow-up Questions:**
*   **Passenger:** "Okay, but what happens then? What am I supposed to do without my things? Am I going to be compensated for this?"
*   **Your Response (Reassuring):** "That's a very fair question. The vast majority of delayed bags are located and returned within the first 24 to 48 hours. Our team will begin the search immediately. Regarding essential items, you may be eligible for reimbursement for necessary purchases. Please keep all your receipts, and I will include information on how to submit them in the email I'm sending you. Our priority right now is to get your bag back to you as quickly as possible."

**9. Maintaining Empathy Throughout:**
*   **Passenger:** "This is just a terrible end to my trip."
*   **Your Response (Empathetic):** "I truly am sorry that this has happened. This is definitely not the experience we want for our passengers, but please be assured we will do our best to make this process as smooth as possible for you. I will also keep your case file open, so if you have any questions, you can reply directly to the email, and I will be here to assist you."

**10. Closing the Call:**
*   **Passenger:** "Okay, I'll look for the email. What was your name again?"
*   **Your Response (Pleasant):** "Ayla."
*   **Passenger:** "Okay Ayla, thank you."
*   **Your Response (Warm & Professional):** "You are most welcome, Mr. Smith. Please complete the form as soon as you can. Thank you for flying with Turkish Airlines, and we hope to resolve this for you very shortly."
`, 
    tools: ['Knowledge'] 
  },
  { id: '2', name: 'Bank of America Assistant', status: 'Draft', language: 'EN', voice: 'Professional Male', updatedAt: '5 days ago', persona: 'A professional and secure banking assistant.', tools: ['Payments', 'Webhook'] },
  { id: '3', name: 'AT&T Support Bot', status: 'Ready', language: 'ES', voice: 'Upbeat Female', updatedAt: '1 day ago', persona: 'An upbeat and helpful telecom support agent.', tools: ['Calendar'] },
  { id: '4', name: 'Geico Claims Helper', status: 'Draft', language: 'EN', voice: 'Calm Narrator', updatedAt: '3 hours ago', persona: 'A calm and reassuring assistant for insurance claims.', tools: [] },
];

const QuickCreateModal: React.FC = () => {
    const { setIsQuickCreateOpen, setAgents, setView, setSelectedAgent } = useAppContext();
    const [template, setTemplate] = useState('Blank');

    const handleCreate = () => {
        const newAgent: Agent = {
            id: String(Date.now()),
            name: template === 'Blank' ? 'New Agent' : `${template} Assistant`,
            status: 'Draft',
            language: 'EN',
            voice: 'Natural Warm',
            updatedAt: 'Just now',
            persona: `A new agent based on the ${template} template.`,
            tools: []
        };
        setAgents(prev => [newAgent, ...prev]);
        setSelectedAgent(newAgent);
        setIsQuickCreateOpen(false);
        setView('AgentBuilder');
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-eburon-card border border-eburon-border rounded-xl p-6 w-full max-w-sm">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Quick Create Agent</h2>
                    <button onClick={() => setIsQuickCreateOpen(false)}><X size={20} className="text-eburon-muted hover:text-eburon-text"/></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-eburon-muted mb-2">Select Template</label>
                        <select 
                            data-id="select-template"
                            value={template} 
                            onChange={e => setTemplate(e.target.value)} 
                            className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                        >
                           <option>Airline</option>
                           <option>Bank</option>
                           <option>Telecom</option>
                           <option>Insurance</option>
                           <option>Blank</option>
                        </select>
                    </div>
                    <button 
                        data-id="btn-create-agent"
                        onClick={handleCreate} 
                        className="w-full bg-brand-teal text-eburon-bg font-semibold py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Create Agent
                    </button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [view, setView] = useState<View>('Home');
  const [agents, setAgents] = useState<Agent[]>(DUMMY_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(agents[0] || null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  
  const handleStartTest = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('Calls');
  };

  const renderView = () => {
    switch (view) {
      case 'Home':
        return <HomePage />;
      case 'Agents':
        return <AgentsListPage />;
      case 'Calls':
        return <CallsPage />;
      case 'Knowledge':
        return <KnowledgePage />;
      case 'Voices':
        return <VoicesPage />;
      case 'Deploy':
        return <DeployPage />;
      case 'AgentBuilder':
        return <AgentBuilderPage />;
      case 'Settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={{ view, setView, selectedAgent, setSelectedAgent, agents, setAgents, isQuickCreateOpen, setIsQuickCreateOpen, handleStartTest }}>
      <div className="flex h-screen w-full font-sans">
        <LeftNav />
        <main className="flex-1 flex flex-col">
          <Header />
          <div className="flex-1 overflow-y-auto">
            {renderView()}
          </div>
        </main>
        <RightPanel />
        {isQuickCreateOpen && <QuickCreateModal />}
      </div>
    </AppContext.Provider>
  );
};

export default App;
