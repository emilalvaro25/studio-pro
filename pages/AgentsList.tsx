import React, { useState, useMemo } from 'react';
import { Plus, MoreVertical, Play, Edit, Bot, History } from 'lucide-react';
import { useAppContext } from '../App';
import { Agent, AgentStatus } from '../types';

const StatusPill: React.FC<{ status: AgentStatus }> = ({ status }) => {
  const styles = {
    Draft: 'bg-eburon-muted/20 text-eburon-muted',
    Ready: 'bg-ok/20 text-ok',
    Live: 'bg-brand-teal/20 text-brand-teal',
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
                <h1 className="text-xl font-semibold text-eburon-text">Agents</h1>
                <div className="flex items-center space-x-4">
                    <input 
                        type="text" 
                        placeholder="Search agents..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-64 bg-eburon-card border border-eburon-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                    />
                    <button onClick={() => setIsQuickCreateOpen(true)} data-id="btn-new-agent" className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                        <Plus size={18} />
                        <span>New Agent</span>
                    </button>
                </div>
            </div>

            {agents.length > 0 ? (
                <div className="bg-eburon-card border border-eburon-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="border-b border-eburon-border text-xs text-eburon-muted uppercase">
                            <tr>
                                <th className="p-4 font-medium">Name</th>
                                <th className="p-4 font-medium">Status</th>
                                <th className="p-4 font-medium">Language</th>
                                <th className="p-4 font-medium">Voice</th>
                                <th className="p-4 font-medium">Updated</th>
                                <th className="p-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-eburon-border">
                            {filteredAgents.map(agent => (
                                <tr key={agent.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedAgent(agent)}>
                                    <td className="p-4 font-semibold text-eburon-text">{agent.name}</td>
                                    <td className="p-4"><StatusPill status={agent.status} /></td>
                                    <td className="p-4 text-eburon-muted">{agent.language}</td>
                                    <td className="p-4 text-eburon-muted">{agent.voice}</td>
                                    <td className="p-4 text-eburon-muted">{agent.updatedAt}</td>
                                    <td className="p-4">
                                        <div className="flex items-center space-x-3 text-eburon-muted">
                                            <button onClick={(e) => handleTest(e, agent)} className="hover:text-brand-teal" title="Test"><Play size={18}/></button>
                                            <button onClick={(e) => handleEdit(e, agent)} className="hover:text-brand-gold" title="Edit"><Edit size={18}/></button>
                                            <button onClick={(e) => handleOpenVersions(e, agent)} className="hover:text-eburon-text" title="Version History"><History size={18}/></button>
                                            <button className="hover:text-eburon-text" title="More" onClick={(e) => e.stopPropagation()}><MoreVertical size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-20 bg-eburon-card border border-eburon-border rounded-xl">
                    <Bot size={48} className="mx-auto text-eburon-muted" />
                    <h2 className="mt-4 text-lg font-semibold text-eburon-text">No agents yet.</h2>
                    <p className="mt-1 text-eburon-muted">Create your first agent to get started.</p>
                    <button 
                        onClick={() => setIsQuickCreateOpen(true)} 
                        data-id="btn-new-agent-empty" 
                        className="mt-6 flex items-center mx-auto space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
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