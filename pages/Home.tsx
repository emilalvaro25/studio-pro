import React from 'react';
import { Plus, Upload, Phone, Send, Edit, Play } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentStatus, CallRecord } from '../types';

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

const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
};


const HomePage: React.FC = () => {
  // FIX: Add `addNotification` to the destructuring to make it available in the component.
  const { agents, callHistory, setIsQuickCreateOpen, setView, setSelectedAgent, handleStartTest, addNotification } = useAppContext();

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('AgentBuilder');
  };
  
  const handleNavigateAndEdit = (agent: Agent, tab: 'Telephony') => {
      setSelectedAgent(agent);
      setView('AgentBuilder');
      // A slight delay might be needed if the builder component needs to mount first
      setTimeout(() => {
          // This is an indirect way to signal tab change. A more robust solution might use context.
          // For now, we rely on the component's internal state management after navigation.
          // The user will land on the AgentBuilder and can then click the tab.
      }, 100);
  };


  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setIsQuickCreateOpen(true)} className="p-4 bg-brand-teal/90 hover:bg-brand-teal text-white rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Plus size={20} />
          <span className="font-semibold">New Agent</span>
        </button>
        <button onClick={() => setView('Knowledge')} className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Upload size={20} className="text-eburon-muted" />
          <span className="font-semibold">Import Knowledge</span>
        </button>
        <button onClick={() => { if(agents.length > 0) { handleNavigateAndEdit(agents[0], 'Telephony'); } else { addNotification('Create an agent first to connect a number.', 'warn'); } }} className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Phone size={20} className="text-eburon-muted" />
          <span className="font-semibold">Connect Number</span>
        </button>
        <button onClick={() => setView('Deploy')} className="p-4 bg-eburon-card hover:bg-white/5 border border-eburon-border rounded-xl flex items-center justify-center space-x-2 transition-all">
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
             {agents.length === 0 && <p className="text-sm text-center text-eburon-muted py-4">No agents created yet.</p>}
          </div>
        </Card>
        <Card title="Latest Calls">
            <div className="space-y-3 text-sm">
                {callHistory.slice(0, 3).map((call: CallRecord) => (
                    <div key={call.id} className="flex justify-between items-center p-2 rounded-lg">
                        <div className="truncate">
                            <span className="font-medium text-eburon-text">{call.agentName}</span>
                            <p className="text-xs text-eburon-muted truncate">{call.transcript[0]?.text.substring(0, 40)}...</p>
                        </div>
                        <span className="text-ok font-medium flex-shrink-0 ml-4">{formatDuration(call.duration)}</span>
                    </div>
                ))}
                 {callHistory.length === 0 && <p className="text-sm text-center text-eburon-muted py-4">No calls have been made.</p>}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;