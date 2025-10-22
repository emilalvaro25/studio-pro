import React from 'react';
import { Plus, Upload, Phone, Send, Edit, Play } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentStatus } from '../types';

const Card: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
  <div className="bg-eburon-card border border-eburon-border rounded-xl p-4">
    <h3 className="font-semibold text-eburon-text mb-3">{title}</h3>
    {children}
  </div>
);

const StatusPill: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const styles = {
    Draft: 'bg-eburon-muted/20 text-eburon-muted',
    Ready: 'bg-ok/20 text-ok',
    Live: 'bg-brand-teal/20 text-brand-teal',
  };
  return <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${styles[status]}`}>{status}</span>;
};

const HomePage: React.FC = () => {
  const { agents, setIsQuickCreateOpen, setView, setSelectedAgent, handleStartTest } = useAppContext();

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('AgentBuilder');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setIsQuickCreateOpen(true)} className="p-4 bg-brand-teal/90 hover:bg-brand-teal text-white rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Plus size={20} />
          <span className="font-semibold">New Agent</span>
        </button>
        <button className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Upload size={20} className="text-eburon-muted" />
          <span className="font-semibold">Import Knowledge</span>
        </button>
        <button className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Phone size={20} className="text-eburon-muted" />
          <span className="font-semibold">Connect Number</span>
        </button>
        <button className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Send size={20} className="text-eburon-muted" />
          <span className="font-semibold">Deploy Endpoint</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Agents">
          <div className="space-y-3">
            {agents.slice(0, 3).map(agent => (
              <div key={agent.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-white/5">
                <div>
                  <span className="text-eburon-text mr-3">{agent.name}</span>
                  <StatusPill status={agent.status} />
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => handleStartTest(agent)} className="text-eburon-muted hover:text-brand-teal" title="Test Agent"><Play size={16}/></button>
                  <button onClick={() => handleEdit(agent)} className="text-eburon-muted hover:text-brand-gold" title="Edit Agent"><Edit size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Latest Tests">
            <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center p-2 rounded-lg">
                    <span>Airline Assistant - Scenario 1</span>
                    <span className="text-ok font-medium">Pass (120ms)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg">
                    <span>Banking Bot - Fraud Check</span>
                    <span className="text-ok font-medium">Pass (150ms)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg">
                    <span>Telecom Support - Plan Change</span>
                    <span className="text-danger font-medium">Fail (Timeout)</span>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;