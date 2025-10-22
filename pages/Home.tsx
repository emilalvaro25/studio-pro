import React from 'react';
import { Plus, Upload, Phone, Send, Edit, Play } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentStatus, CallRecord } from '../types';
import Tooltip from '../components/Tooltip';

const Card: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
  <div className="bg-surface border border-border rounded-xl p-4">
    <h3 className="font-semibold text-text mb-3">{title}</h3>
    {children}
  </div>
);

const StatusPill: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const styles = {
    Draft: 'bg-subtle/20 text-subtle',
    Ready: 'bg-ok/20 text-ok',
    Live: 'bg-primary/20 text-primary',
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
  const { agents, callHistory, setIsQuickCreateOpen, setView, setSelectedAgent, handleStartTest, addNotification } = useAppContext();

  const handleEdit = (agent: Agent) => {
    setSelectedAgent(agent);
    setView('AgentBuilder');
  };
  
  const handleNavigateAndEdit = (agent: Agent) => {
      setSelectedAgent(agent);
      setView('AgentBuilder');
      setTimeout(() => {
          // This is an indirect way to signal tab change. A more robust solution might use context.
          // For now, it just navigates to the builder.
      }, 100);
  };


  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => setIsQuickCreateOpen(true)} className="p-4 bg-primary hover:opacity-90 text-white rounded-xl flex items-center justify-center space-x-2 transition-all shadow-lg shadow-primary/20">
          <Plus size={20} />
          <span className="font-semibold">New Agent</span>
        </button>
        <button onClick={() => setView('Knowledge')} className="p-4 bg-surface hover:bg-panel border border-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Upload size={20} className="text-subtle" />
          <span className="font-semibold">Import Knowledge</span>
        </button>
        <button onClick={() => { if(agents.length > 0) { handleNavigateAndEdit(agents[0]); } else { addNotification('Create an agent first to connect a number.', 'warn'); } }} className="p-4 bg-surface hover:bg-panel border border-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Phone size={20} className="text-subtle" />
          <span className="font-semibold">Connect Number</span>
        </button>
        <button onClick={() => setView('Deploy')} className="p-4 bg-surface hover:bg-panel border border-border rounded-xl flex items-center justify-center space-x-2 transition-all">
          <Send size={20} className="text-subtle" />
          <span className="font-semibold">Deploy Endpoint</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Recent Agents">
          <div className="space-y-2">
            {agents.slice(0, 3).map(agent => (
              <div key={agent.id} className="flex justify-between items-center p-2 rounded-lg hover:bg-panel">
                <div>
                  <span className="text-text font-medium mr-3">{agent.name}</span>
                  <StatusPill status={agent.status} />
                </div>
                <div className="flex items-center space-x-1">
                    <Tooltip text="Test Agent">
                        <button onClick={() => handleStartTest(agent)} className="p-2 rounded-full text-subtle hover:text-primary hover:bg-primary/10"><Play size={16}/></button>
                    </Tooltip>
                    <Tooltip text="Edit Agent">
                        <button onClick={() => handleEdit(agent)} className="p-2 rounded-full text-subtle hover:text-brand-gold hover:bg-brand-gold/10"><Edit size={16}/></button>
                    </Tooltip>
                </div>
              </div>
            ))}
             {agents.length === 0 && <p className="text-sm text-center text-subtle py-4">No agents created yet.</p>}
          </div>
        </Card>
        <Card title="Latest Calls">
            <div className="space-y-3 text-sm">
                {callHistory.slice(0, 3).map((call: CallRecord) => (
                    <div key={call.id} className="flex justify-between items-center p-2 rounded-lg">
                        <div className="truncate">
                            <span className="font-medium text-text">{call.agentName}</span>
                            <p className="text-xs text-subtle truncate">{call.transcript[0]?.text.substring(0, 40)}...</p>
                        </div>
                        <span className="text-ok font-medium flex-shrink-0 ml-4">{formatDuration(call.duration)}</span>
                    </div>
                ))}
                 {callHistory.length === 0 && <p className="text-sm text-center text-subtle py-4">No calls have been made.</p>}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;