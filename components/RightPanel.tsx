
import React, { useState } from 'react';
import { useAppContext } from '../App';
import { Plus, Copy, Rocket, Trash2 } from 'lucide-react';

type Tab = 'Actions' | 'Properties' | 'Logs';

export const RightPanel: React.FC = () => {
  const { selectedAgent, view } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('Properties');
  
  if (!selectedAgent) {
    return (
      <aside className="w-96 bg-eburon-card border-l border-eburon-border p-4 flex flex-col">
        <div className="text-center text-eburon-muted mt-10">No agent selected.</div>
      </aside>
    );
  }

  const renderQuickActions = () => (
    <div className="space-y-2">
        <button className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Plus size={16} className="mr-2 text-brand-teal"/> New Agent
        </button>
         <button className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Copy size={16} className="mr-2 text-brand-gold"/> Clone Agent
        </button>
         <button className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-white/10 transition-colors">
            <Rocket size={16} className="mr-2 text-ok"/> Make Live
        </button>
         <button className="flex items-center w-full p-2 rounded-lg bg-eburon-border hover:bg-red-500/20 text-danger transition-colors">
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
            <p className="text-eburon-text leading-relaxed">{selectedAgent.persona}</p>
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

  const renderLogs = () => (
    <div className="text-xs font-mono text-eburon-muted space-y-1">
        <p><span className="text-brand-teal">[INFO]</span> Initializing test call...</p>
        <p><span className="text-brand-teal">[INFO]</span> Agent connected.</p>
        <p><span className="text-warn">[WARN]</span> High latency detected: 230ms.</p>
        <p><span className="text-ok">[OK]</span> Test call completed successfully.</p>
    </div>
  );


  const renderTabContent = () => {
      switch(activeTab) {
          case 'Actions': return renderQuickActions();
          case 'Properties': return renderProperties();
          case 'Logs': return renderLogs();
          default: return null;
      }
  }

  return (
    <aside className="w-96 bg-eburon-card border-l border-eburon-border p-4 flex flex-col space-y-4">
      <h2 className="text-lg font-semibold text-eburon-text">{selectedAgent.name}</h2>
      
      <div className="flex border-b border-eburon-border">
          {(['Properties', 'Actions', 'Logs'] as Tab[]).map(tab => (
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
