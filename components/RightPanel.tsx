import React, { useState } from 'react';
import { useAppContext } from '../App';
import { Plus, Copy, Rocket, Trash2, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Agent, AgentStatus } from '../types';
import Tooltip from './Tooltip';


type Tab = 'Actions' | 'Properties';

export const RightPanel: React.FC = () => {
  const { selectedAgent, setIsQuickCreateOpen, addNotification, cloneAgent, updateAgent, deleteAgent, isRightPanelOpen, setIsRightPanelOpen } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Properties');
  
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
        <button onClick={() => setIsQuickCreateOpen(true)} className="flex items-center w-full p-2 rounded-lg bg-panel hover:bg-border transition-colors">
            <Plus size={16} className="mr-2 text-primary"/> New Agent
        </button>
         <button onClick={handleClone} className="flex items-center w-full p-2 rounded-lg bg-panel hover:bg-border transition-colors">
            <Copy size={16} className="mr-2 text-brand-gold"/> Clone Agent
        </button>
         <button onClick={handleMakeLive} className="flex items-center w-full p-2 rounded-lg bg-panel hover:bg-border transition-colors">
            <Rocket size={16} className="mr-2 text-ok"/> Make Live
        </button>
         <button onClick={handleDelete} className="flex items-center w-full p-2 rounded-lg bg-panel hover:bg-danger/10 text-danger transition-colors">
            <Trash2 size={16} className="mr-2"/> Delete Agent
        </button>
    </div>
  );

  const renderProperties = () => selectedAgent && (
    <div className="space-y-4 text-sm">
        <div>
            <label className="block text-subtle text-xs mb-1">Name</label>
            <p className="text-text font-medium">{selectedAgent.name}</p>
        </div>
        <div>
            <label className="block text-subtle text-xs mb-1">Status</label>
            <p className="text-text">{selectedAgent.status}</p>
        </div>
         <div>
            <label className="block text-subtle text-xs mb-1">Language</label>
            <p className="text-text">{selectedAgent.language}</p>
        </div>
        <div>
            <label className="block text-subtle text-xs mb-1">Voice</label>
            <p className="text-text">{selectedAgent.voice}</p>
        </div>
         <div>
            <label className="block text-subtle text-xs mb-1">Persona</label>
            <p className="text-text leading-relaxed">{selectedAgent.personaShortText}</p>
        </div>
         <div>
            <label className="block text-subtle text-xs mb-1">Tools</label>
             <div className="flex flex-wrap gap-2 mt-1">
                {selectedAgent.tools.length > 0 ? selectedAgent.tools.map(tool => (
                    <span key={tool} className="bg-panel text-xs px-2 py-1 rounded">{tool}</span>
                )) : <span className="text-subtle text-xs">None</span>}
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
    <aside className={`bg-surface border-l border-border flex-col z-40
        fixed inset-y-0 right-0
        transform transition-transform lg:transition-all duration-300 ease-in-out
        ${isRightPanelOpen ? 'translate-x-0' : 'translate-x-full'}
        lg:relative lg:translate-x-0
        ${isRightPanelOpen ? 'lg:w-80 p-4 flex' : 'lg:w-0 lg:p-0 lg:overflow-hidden'}
        ${!isRightPanelOpen && 'hidden lg:flex'}
    `}>
        <Tooltip text={isRightPanelOpen ? "Collapse panel" : "Expand panel"} position="left">
            <button 
                onClick={() => setIsRightPanelOpen(prev => !prev)}
                className="hidden lg:flex items-center justify-center absolute top-1/2 -left-4 transform -translate-y-1/2 bg-panel text-subtle hover:text-text rounded-full p-1 z-50 border-4 border-background"
                aria-label={isRightPanelOpen ? "Collapse panel" : "Expand panel"}
            >
                {isRightPanelOpen ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
        </Tooltip>

        {!selectedAgent ? (
            <div className="text-center text-subtle mt-10">No agent selected.</div>
        ) : (
            <div className="w-full flex flex-col">
                <h2 className="text-lg font-semibold text-text">{selectedAgent.name}</h2>
                <div className="flex border-b border-border mt-4">
                    {(['Properties', 'Actions'] as Tab[]).map(tab => (
                        <button key={tab} 
                          onClick={() => setActiveTab(tab)}
                          className={`px-3 py-2 text-sm transition-colors ${activeTab === tab ? 'text-primary font-semibold border-b-2 border-primary' : 'text-subtle hover:text-text'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto pt-4">
                  {renderTabContent()}
                </div>
            </div>
        )}
    </aside>
  );
};