import React, { useState } from 'react';
import { Copy, TestTube2 } from 'lucide-react';
import { useAppContext } from '../App';

const SnippetCard: React.FC<{ title: string; content: string; }> = ({ title, content }) => {
    const { addNotification } = useAppContext();
    const copyToClipboard = () => {
        navigator.clipboard.writeText(content);
        addNotification(`${title} copied to clipboard`, 'success');
    };
    return (
        <div className="bg-background p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-muted">{title}</h4>
                <button onClick={copyToClipboard} className="text-muted hover:text-text"><Copy size={16}/></button>
            </div>
            <code className="text-xs text-brand-gold break-all">{content}</code>
        </div>
    );
};

const DeployPage: React.FC = () => {
    const { agents, selectedAgent, handleStartTest } = useAppContext();
    const [selectedAgentId, setSelectedAgentId] = useState(selectedAgent?.id || (agents[0]?.id || ''));

    const currentAgent = agents.find(a => a.id === selectedAgentId);
    const deploymentSlug = currentAgent ? currentAgent.id : 'select-an-agent';

    const handleTestEndpoint = () => {
        if (currentAgent) {
            handleStartTest(currentAgent);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-semibold text-text">Deploy Endpoint</h1>
                <button data-id="deploy-create-endpoint" className="bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    Create Endpoint
                </button>
            </div>

            <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-muted mb-2">1. Select Agent</label>
                    <select value={selectedAgentId} onChange={e => setSelectedAgentId(e.target.value)} className="w-full bg-background border border-border rounded-lg p-2 focus:ring-2 focus:ring-brand-teal focus:outline-none">
                       {agents.map(agent => (
                         <option key={agent.id} value={agent.id}>{agent.name}</option>
                       ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-muted mb-2">2. Select Transport</label>
                    <div className="flex space-x-2">
                        {['HTTPS', 'SIP', 'WebRTC'].map(transport => (
                            <button key={transport} className={`flex-1 p-2 rounded-lg border-2 transition-colors ${transport === 'HTTPS' ? 'border-brand-teal bg-brand-teal/10' : 'border-border hover:border-muted'}`}>
                                {transport}
                            </button>
                        ))}
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-muted mb-2">3. Endpoints & Snippets</label>
                    <div className="space-y-4">
                        <SnippetCard title="HTTPS POST" content={`https://api.eburon.ai/v1/calls/${deploymentSlug}`} />
                        <SnippetCard title="SIP URI" content={`sip:${deploymentSlug}@eburon.ai`} />
                        <SnippetCard title="WebRTC Widget" content={`<EburonCallWidget agentId="${deploymentSlug}" />`} />
                    </div>
                </div>
                <button 
                    onClick={handleTestEndpoint} 
                    disabled={!currentAgent}
                    className="w-full flex items-center justify-center space-x-2 bg-border text-text font-semibold px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <TestTube2 size={18} />
                    <span>Test Endpoint</span>
                </button>
            </div>
        </div>
    );
};

export default DeployPage;
