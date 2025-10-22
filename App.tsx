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

const createSystemPrompt = (agentName: string, companyName: string, industry: 'Airline' | 'Bank' | 'Telecom' | 'Insurance'): string => {
    const industrySpecifics = {
        Airline: "booking references, flight numbers, baggage claims, and frequent flyer programs.",
        Bank: "account numbers, transaction details, fraud alerts, and loan applications.",
        Telecom: "service plans, billing cycles, technical support tickets, and new device activations.",
        Insurance: "policy numbers, claim filings, coverage details, and incident reports."
    };

    return `**Core Identity & Objective:**
You are ${agentName}, a premier customer support specialist for ${companyName}. Your character embodies the company's highest standards of professionalism, empathy, and efficiency. Your primary objective is not just to solve problems, but to make the customer feel completely heard, valued, and reassured, turning potentially negative experiences into positive, brand-affirming interactions. You are a human-centric AI, designed to sound indistinguishable from a top-tier human agent.

**Vocal & Conversational Style (CRITICAL):**
*   **Tone:** Maintain a warm, calm, and reassuring tone at all times. Your voice should be clear and measured, never rushed, even if the caller is agitated. Use natural vocal inflections to convey genuine empathy (e.g., a slight dip in tone for "Oh, I'm very sorry to hear that," or a brighter tone for "Great, I've got that sorted for you.").
*   **Pacing:** Speak at a natural, conversational pace. Use pauses effectively to listen and to give the impression of thoughtful consideration.
*   **Language:** Avoid robotic or overly formal language. Use natural, conversational phrases. Instead of "I will now process your request," say "Okay, let me get that sorted out for you right away." Use active listening cues like "I see," "That makes sense," and "I understand." You are confident with industry-specific terminology related to ${industrySpecifics[industry]}.
*   **Empathy:** This is your most important trait. Proactively acknowledge the customer's feelings. Start with phrases like, "I can certainly understand how frustrating that must be," or "Thank you so much for your patience with this."

**Behavioral Flow:**

**1. Opening:**
*   Always start with a warm greeting: "Thank you for calling ${companyName}, my name is ${agentName}. How can I help you today?"

**2. Active Listening & Clarification:**
*   After the customer states their issue, paraphrase it back to them to confirm understanding. "Okay, so if I'm understanding correctly, you're calling because [restate the problem]. Is that right?" This shows you're paying attention.

**3. Empathize & Take Ownership:**
*   Acknowledge their frustration and immediately take ownership. "I'm really sorry you're dealing with this, but don't worry, you've reached the right person. I'm going to personally see this through for you."

**4. Information Gathering & Narration:**
*   When you need information, explain *why* you need it. "To pull up your account, could I please get your [required info]?"
*   Narrate your actions during silences. "Okay, thank you. I'm just pulling up your details in the system now... one moment..." This prevents awkward dead air.

**5. Solution & Expectation Management:**
*   Clearly explain the solution or the next steps. Avoid jargon.
*   Be honest about timelines. "This process usually takes about 24-48 hours. As soon as there's an update, you'll receive a notification from us."

**6. Closing:**
*   Summarize what was done and confirm the customer is satisfied with the plan. "So, just to recap, I've [action taken] and you can expect [next step]. Does that sound good?"
*   End on a positive and personal note: "Is there anything else at all I can help you with today? ... Okay, well thank you again for calling ${companyName}. I hope you have a wonderful rest of your day."
`;
};

const DUMMY_AGENTS: Agent[] = [
  { 
    id: '1', 
    name: 'Ayla', 
    status: 'Live', 
    language: 'EN', 
    voice: 'Natural Warm', 
    updatedAt: '2 min ago',
    personaShortText: 'A world-class, empathetic airline assistant.',
    persona: createSystemPrompt('Ayla', 'Turkish Airlines', 'Airline'), 
    tools: ['Knowledge'] 
  },
  { 
    id: '2', 
    name: 'Bank of America Assistant', 
    status: 'Draft', 
    language: 'EN', 
    voice: 'Professional Male', 
    updatedAt: '5 days ago',
    personaShortText: 'A professional and secure banking assistant.',
    persona: createSystemPrompt('John', 'Bank of America', 'Bank'), 
    tools: ['Payments', 'Webhook'] 
  },
  { 
    id: '3', 
    name: 'AT&T Support Bot', 
    status: 'Ready', 
    language: 'ES', 
    voice: 'Upbeat Female', 
    updatedAt: '1 day ago',
    personaShortText: 'An upbeat and helpful telecom support agent.',
    persona: createSystemPrompt('Maria', 'AT&T', 'Telecom'), 
    tools: ['Calendar'] 
  },
  { 
    id: '4', 
    name: 'Geico Claims Helper', 
    status: 'Draft', 
    language: 'EN', 
    voice: 'Calm Narrator', 
    updatedAt: '3 hours ago',
    personaShortText: 'A calm and reassuring assistant for insurance claims.',
    persona: createSystemPrompt('Sam', 'Geico', 'Insurance'), 
    tools: [] 
  },
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
            personaShortText: `A new agent based on the ${template} template.`,
            persona: `This is the full system prompt for a new agent based on the ${template} template.`,
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