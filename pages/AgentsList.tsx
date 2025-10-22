import React, { useState, useMemo } from 'react';
import { Plus, MoreVertical, Play, Edit, Bot, History } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentStatus } from '../types';
import Tooltip from '../components/Tooltip';

const StatusPill: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const styles = {
    Draft: 'bg-subtle/20 text-subtle',
    Ready: 'bg-ok/20 text-ok',
    Live: 'bg-primary/20 text-primary',
  };
  return <span className={`px-2 py-1 text-xs rounded-full font-medium ${styles[status]}`}>{status}</span>;
};

const AgentsListPage: React.FC = () => {
    const { agents, setSelectedAgent, setIsQuickCreateOpen, setView, handleStartTest, setVersioningAgent } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAgents = useMemo(() => {
        return agents.filter(agent =>
            agent.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [agents, searchTerm]);

    const handleEdit = (e: React.MouseEvent, agent: Agent) => {
        e.stopPropagation();
        setSelectedAgent(agent);
        setView('AgentBuilder');
    };

    const handleTest = (e: React.MouseEvent, agent: Agent) => {
        e.stopPropagation();
        handleStartTest(agent);
    };
    
    const handleOpenVersions = (e: React.MouseEvent, agent: Agent) => {
        e.stopPropagation();
        setVersioningAgent({ agent });
    };


    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-semibold text-text">Agents</h1>
                <div className="flex items-center space-x-4">
                    <input 
                        type="text" 
                        placeholder="Search agents..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-64 bg-surface border border-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button onClick={() => setIsQuickCreateOpen(true)} data-id="btn-new-agent" className="flex items-center space-x-2 bg-primary text-white font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                        <Plus size={18} />
                        <span>New Agent</span>
                    </button>
                </div>
            </div>

            {agents.length > 0 ? (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-border text-xs text-subtle uppercase">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Language</th>
                                <th className="p-4 font-medium">Voice</th>
                                <th className="p-4 font-medium">Updated</th>
                                <th className="p-4 font-medium text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAgents.map(agent => (
                                <tr key={agent.id} className="hover:bg-panel cursor-pointer" onClick={() => setSelectedAgent(agent)}>
                                    <td className="p-4 font-semibold text-text">{agent.name}</td>
                                    <td className="p-4"><StatusPill status={agent.status} /></td>
                                    <td className="p-4 text-subtle">{agent.language}</td>
                                    <td className="p-4 text-subtle">{agent.voice}</td>
                                    <td className="p-4 text-subtle">{agent.updatedAt}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center space-x-2 text-subtle">
                                            <Tooltip text="Test">
                                                <button onClick={(e) => handleTest(e, agent)} className="p-2 rounded-full hover:text-primary hover:bg-primary/10"><Play size={16}/></button>
                                            </Tooltip>
                                            <Tooltip text="Edit">
                                                <button onClick={(e) => handleEdit(e, agent)} className="p-2 rounded-full hover:text-brand-gold hover:bg-brand-gold/10"><Edit size={16}/></button>
                                            </Tooltip>
                                            <Tooltip text="Version History">
                                                <button onClick={(e) => handleOpenVersions(e, agent)} className="p-2 rounded-full hover:text-text hover:bg-panel"><History size={16}/></button>
                                            </Tooltip>
                                            <Tooltip text="More">
                                                <button className="p-2 rounded-full hover:text-text hover:bg-panel" onClick={(e) => e.stopPropagation()}><MoreVertical size={16}/></button>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-surface border border-border rounded-xl">
                    <Bot size={48} className="mx-auto text-subtle" />
                    <h2 className="mt-4 text-lg font-semibold text-text">No agents yet.</h2>
                    <p className="mt-1 text-subtle">Create your first agent to get started.</p>
                    <button 
                        onClick={() => setIsQuickCreateOpen(true)} 
                        data-id="btn-new-agent-empty" 
                        className="mt-6 flex items-center mx-auto space-x-2 bg-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                        <Plus size={18} />
                        <span>New Agent</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AgentsListPage;