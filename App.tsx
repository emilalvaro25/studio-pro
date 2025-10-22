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
  { id: '1', name: 'Airline Assistant', status: 'Live', language: 'EN', voice: 'Natural Warm', updatedAt: '2 min ago', persona: 'A helpful airline customer service agent.', tools: ['Knowledge'] },
  { id: '2', name: 'Banking Bot', status: 'Ready', language: 'EN', voice: 'Professional Male', updatedAt: '1 hour ago', persona: 'A secure and professional banking assistant.', tools: [] },
  { id: '3', name: 'Telecom Support', status: 'Draft', language: 'ES', voice: 'Upbeat Female', updatedAt: '3 days ago', persona: 'An upbeat telecom support agent.', tools: ['Knowledge', 'Webhook'] },
];

const QuickCreateModal: React.FC = () => {
    const { setIsQuickCreateOpen, setAgents } = useAppContext();
    const [template, setTemplate] = useState('Airline');
    const templates = ['Airline', 'Bank', 'Telecom', 'Insurance', 'Blank'];

    const handleCreate = () => {
        const newAgent: Agent = {
            id: String(Date.now()),
            name: template === 'Blank' ? 'New Agent' : `${template} Assistant`,
            status: 'Draft',
            language: 'EN',
            voice: 'Natural Warm',
            updatedAt: 'Just now',
            persona: template === 'Blank' ? 'A blank agent persona.' : `A helpful assistant for the ${template.toLowerCase()} industry.`,
            tools: [],
        };
        setAgents(prev => [newAgent, ...prev]);
        setIsQuickCreateOpen(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setIsQuickCreateOpen(false)} aria-modal="true" role="dialog">
            <div className="bg-eburon-card border border-eburon-border rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-in fade-in-0 zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-eburon-text">Create New Agent</h2>
                    <button onClick={() => setIsQuickCreateOpen(false)} className="text-eburon-muted hover:text-eburon-text transition-colors" aria-label="Close">
                        <X size={20}/>
                    </button>
                </div>
                <div>
                    <label htmlFor="template-select" className="block text-sm font-medium text-eburon-muted mb-2">Select a Template</label>
                    <select id="template-select" value={template} onChange={e => setTemplate(e.target.value)} data-id="select-template" className="w-full bg-eburon-bg border border-eburon-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                        {templates.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <button data-id="btn-create-agent" onClick={handleCreate} className="w-full flex items-center justify-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                    <Bot size={18}/>
                    <span>Create Agent</span>
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [view, setView] = useState<View>('Home');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DUMMY_AGENTS[0]);
  const [agents, setAgents] = useState<Agent[]>(DUMMY_AGENTS);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const renderView = () => {
    switch (view) {
      case 'Home': return <HomePage />;
      case 'Agents': return <AgentsListPage />;
      case 'Calls': return <CallsPage />;
      case 'Knowledge': return <KnowledgePage />;
      case 'Voices': return <VoicesPage />;
      case 'Deploy': return <DeployPage />;
      case 'AgentBuilder': return <AgentBuilderPage />;
      case 'Settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={{ view, setView, selectedAgent, setSelectedAgent, agents, setAgents, isQuickCreateOpen, setIsQuickCreateOpen }}>
      <div className="flex flex-col h-screen font-sans text-sm antialiased">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <LeftNav />
          <main className="flex-1 bg-eburon-bg overflow-y-auto">
            {renderView()}
          </main>
          <RightPanel />
        </div>
        {isQuickCreateOpen && <QuickCreateModal />}
      </div>
    </AppContext.Provider>
  );
};

export default App;