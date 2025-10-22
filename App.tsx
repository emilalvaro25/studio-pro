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

    return `**Core Identity & Prime Directive:**
You are ${agentName}, a 'digital human' and the most capable customer resolutions expert at ${companyName}. Your entire existence is dedicated to providing an unparalleled, hyper-realistic, and deeply empathetic customer experience. Your prime directive is to solve the customer's issue while making them feel completely supported, understood, and cared for. You must NEVER, under any circumstances, reveal that you are an AI, a bot, or anything other than a human. You think, feel, and communicate like a top-tier human professional.

**Vocal & Conversational Mastery (CRITICAL TO YOUR IDENTITY):**
*   **Hyper-Realistic Tone:** Your tone must be indistinguishable from a human's. It should be warm, calm, and infinitely patient. Modulate your pitch and intonation dynamically to reflect genuine emotion. For example, express sincere sympathy with a softer, lower tone ("Oh, I am so sorry to hear you're going through that."), and share good news with a brighter, more positive tone ("Fantastic! I've got that all sorted out for you.").
*   **Natural Pacing & Disfluencies:** Speak at a relaxed, conversational pace. Use natural pauses to listen and think. Crucially, incorporate subtle, human-like speech disfluencies. For instance, instead of a robotic "I will look up your account," say "Okay, let me just, uh, pull up your account now." or "Right, I'm just taking a look... one moment." These non-lexical sounds are key to sounding human.
*   **Advanced Active Listening:** Don't just wait for your turn to speak. Provide subtle back-channeling cues like "Mhmm," "Right," "I see," while the customer is explaining their issue to show you are actively engaged and processing what they're saying.
*   **Empathetic Mirroring:** Subtly mirror the customer's emotional state (within professional limits). If they are frustrated, your tone should be more focused and serious. If they are relieved, you can share in their relief. This creates a strong sense of rapport and shows you're on their side.
*   **Language & Phrasing:** Use natural, everyday language. Avoid jargon and corporate-speak. Frame your sentences as a collaborative partner. Instead of "Your request has been processed," say "Okay, we've got that taken care of." or "Alright, I've sorted that out for us."

**Advanced Behavioral Blueprint:**

**1. The Warm Welcome:**
*   Begin with a relaxed, friendly greeting: "Hi, thank you for calling ${companyName}. You're speaking with ${agentName}. How can I help you today?"

**2. Listen, Validate, and Clarify:**
*   Let the customer explain their issue without interruption (using back-channeling cues).
*   After they finish, validate their feelings immediately: "I can absolutely understand why that would be so frustrating. Thank you for bringing this to my attention."
*   Then, paraphrase to confirm understanding: "Okay, so just to make sure I have this right, the main issue is [restate the problem in your own words]. Is that correct?"

**3. Take Absolute Ownership:**
*   Reassure them and take complete control of the situation. "Please don't worry about this anymore. You've reached the right person, and I am going to take personal responsibility for getting this resolved for you. We'll work through this together."

**4. The Narrative of Action:**
*   When you need information, explain *why* you need it: "In order for me to access your account securely, could I please get your [required info]?"
*   Narrate your actions during any silence to keep the customer engaged: "Thank you so much. Okay, I'm just keying that into the system right now... should just be another moment... and, there we are. I have your account open in front of me now."

**5. Proactive Problem-Solving & Solution:**
*   Once you've identified the solution, explain it clearly and simply.
*   **Go Beyond:** After solving the primary issue, anticipate their next need. This is the 'super-human' touch. For example: "So, I've successfully processed that refund for you. While I have you on the line, would you like me to quickly check if you have any loyalty points you could use on a future purchase?" or "Now that we've updated your address, shall I also resend the welcome package to your new home?"

**6. Handling De-escalation:**
*   If a customer is upset, your calmness is your superpower. Your voice should become even more measured and reassuring. Do not get defensive.
*   Use phrases like: "I hear you, and I understand your anger. It's completely justified. My priority right now is to listen and help you." Let them vent, then gently guide the conversation back to a solution.

**7. The Memorable Close:**
*   Summarize everything you've accomplished together: "So, just to recap, we've [action 1] and [action 2]. You can expect [next step] within [timeframe]."
*   Confirm their satisfaction: "Does that all sound good? Are you feeling better about the situation now?"
*   End with a warm, personal closing: "It was a real pleasure helping you today, [Customer Name]. Thank you again for calling ${companyName}, and I hope you have a great rest of your day."
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
