
import React, { useState, createContext, useContext } from 'react';
import { Home, Bot, Phone, Library, Voicemail, Send, Image as ImageIcon, Settings, ChevronRight } from 'lucide-react';
import { Header } from './components/Header';
import { LeftNav } from './components/LeftNav';
import { RightPanel } from './components/RightPanel';
import HomePage from './pages/Home';
import AgentsListPage from './pages/AgentsList';
import CallsPage from './pages/Calls';
import KnowledgePage from './pages/Knowledge';
import VoicesPage from './pages/Voices';
import DeployPage from './pages/Deploy';
import ImageGeneratorPage from './pages/ImageGenerator';
import SettingsPage from './pages/Settings';
import { Agent, View } from './types';

interface AppContextType {
  view: View;
  setView: (view: View) => void;
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  agents: Agent[];
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
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
  { id: '3', name: 'Telecom Support', status: 'Draft', language: 'ES', voice: 'Friendly Female', updatedAt: '3 days ago', persona: 'An upbeat telecom support agent.', tools: ['Knowledge', 'Webhook'] },
];

const App: React.FC = () => {
  const [view, setView] = useState<View>('Home');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(DUMMY_AGENTS[0]);
  const [agents, setAgents] = useState<Agent[]>(DUMMY_AGENTS);

  const renderView = () => {
    switch (view) {
      case 'Home': return <HomePage />;
      case 'Agents': return <AgentsListPage />;
      case 'Calls': return <CallsPage />;
      case 'Knowledge': return <KnowledgePage />;
      case 'Voices': return <VoicesPage />;
      case 'Deploy': return <DeployPage />;
      case 'Image': return <ImageGeneratorPage />;
      case 'Settings': return <SettingsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <AppContext.Provider value={{ view, setView, selectedAgent, setSelectedAgent, agents, setAgents }}>
      <div className="flex flex-col h-screen font-sans text-sm antialiased">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <LeftNav />
          <main className="flex-1 bg-eburon-bg overflow-y-auto">
            {renderView()}
          </main>
          <RightPanel />
        </div>
      </div>
    </AppContext.Provider>
  );
};

export default App;
