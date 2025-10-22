import React, { useState } from 'react';
import { useAppContext } from '../App';
import { Plus, Copy, Rocket, Trash2 } from 'lucide-react';
import type { Agent, AgentStatus } from '../types';

type Tab = 'Actions' | 'Properties';

export const RightPanel: React.FC = () => {
  const { selectedAgent, agents, setSelectedAgent, setIsQuickCreateOpen, addNotification, cloneAgent, updateAgent, deleteAgent } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Properties');
  
  if (!selectedAgent) {
    return (
      <aside className="w-96 bg-eburon-card border-l border-eburon-border p-4 flex flex-col">
        <div className="text-center text-eburon-muted mt-10">No agent selected.</div>
      </aside>
    );
  }
  
  const handleClone = async () => {
    if (!selectedAgent) return;
    await cloneAgent(selectedAgent);
  };

  const handleMakeLive = async () => {
      if (!selectedAgent) return;
      const updatedAgent = { ...selectedAgent, status: 'Live' as AgentStatus, updatedAt: 'Just now' };
      const success = await updateAgent(updatedAgent);
      if (success) {
          addNotification(`Agent "${selectedAgent.name}" is now Live.`, 'success');
      }
  };

  const handleDelete = async () => {
      if (!selectedAgent) return;
      if (window.confirm(`Are you sure you want to delete "${selectedAgent.name}"? This action cannot be undone.`)) {
        await deleteAgent(selectedAgent.id);
      }
  };

  const renderQuickActions = () => (
    <div className="space-y-2">
        <button onClick={() => setIsQuickCreateOpen(true)} className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Plus size={16} className="mr-2 text-brand-teal"/> New Agent
        </button>
         <button onClick={handleClone} className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Copy size={16} className="mr-2 text-brand-gold"/> Clone Agent
        </button>
         <button onClick={handleMakeLive} className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Rocket size={16} className="mr-2 text-ok"/> Make Live
        </button>
         <button onClick={handleDelete} className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-red-500/20 text-danger transition-colors">
            <Trash2 size={16} className="mr-2"/> Delete Agent
        </button>
    </div>
  );

  const renderProperties = () => (
    <div className="space-y-4 text-xs">
        <div>
            <label className="block text-eburon-muted mb-1">Name</label>
            <p className="text-eburon-text">{selectedAgent.name}</p>
        </div>
        <div>
            <label className="block text-eburon-muted mb-1">Status</label>
            <p className="text-eburon-text">{selectedAgent.status}</p>
        </div>
         <div>
            <label className="block text-eburon-muted mb-1">Language</label>
            <p className="text-eburon-text">{selectedAgent.language}</p>
        </div>
        <div>
            <label className="block text-eburon-muted mb-1">Voice</label>
            <p className="text-eburon-text">{selectedAgent.voice}</p>
        </div>
         <div>
            <label className="block text-eburon-muted mb-1">Persona</label>
            <p className="text-eburon-text leading-relaxed">{selectedAgent.personaShortText}</p>
        </div>
         <div>
            <label className="block text-eburon-muted mb-1">Tools</label>
             <div className="flex flex-wrap gap-2 mt-1">
                {selectedAgent.tools.length > 0 ? selectedAgent.tools.map(tool => (
                    <span key={tool} className="bg-eburon-border px-2 py-1 rounded">{tool}</span>
                )) : <span className="text-eburon-muted">None</span>}
            </div>
        </div>
    </div>
  );

  const renderTabContent = () => {
      switch(activeTab) {
          case 'Actions': return renderQuickActions();
          case 'Properties': return renderProperties();
          default: return null;
      }
  }

  return (
    <aside className="w-96 bg-eburon-card border-l border-eburon-border p-4 flex flex-col space-y-4">
      <h2 className="text-lg font-semibold text-eburon-text">{selectedAgent.name}</h2>
      
      <div className="flex border-b border-eburon-border">
          {(['Properties', 'Actions'] as Tab[]).map(tab => (
              <button key={tab} 
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm transition-colors ${activeTab === tab ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-eburon-muted hover:text-eburon-text'}`}>
                  {tab}
              </button>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {renderTabContent()}
      </div>
    </aside>
  );
};