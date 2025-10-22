
import React from 'react';
import { Plus, Upload, MoreVertical, RefreshCw, Trash2 } from 'lucide-react';

const KnowledgePage: React.FC = () => {
    const knowledgeBases = [
        { id: 1, source: 'Airlines FAQ.pdf', chunks: 152, status: 'Indexed', updated: '2 hours ago' },
        { id: 2, source: 'https://bank.example/terms', chunks: 88, status: 'Indexed', updated: '1 day ago' },
        { id: 3, source: 'Telecom Plans 2024.docx', chunks: 210, status: 'Indexing...', updated: '5 minutes ago' },
    ];

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-semibold text-eburon-text">Knowledge</h1>
                <button data-id="kb-import" className="flex items-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                    <Upload size={18} />
                    <span>Import</span>
                </button>
            </div>
             <div className="bg-eburon-card border border-eburon-border rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="border-b border-eburon-border text-xs text-eburon-muted uppercase">
                        <tr>
                            <th className="p-4 font-medium">Source</th>
                            <th className="p-4 font-medium">Chunks</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Updated</th>
                            <th className="p-4 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-eburon-border">
                        {knowledgeBases.map(kb => (
                            <tr key={kb.id} className="hover:bg-white/5">
                                <td className="p-4 font-semibold text-eburon-text">{kb.source}</td>
                                <td className="p-4 text-eburon-muted">{kb.chunks}</td>
                                <td className="p-4 text-eburon-muted">
                                    <span className={kb.status === 'Indexing...' ? 'text-warn' : 'text-ok'}>{kb.status}</span>
                                </td>
                                <td className="p-4 text-eburon-muted">{kb.updated}</td>
                                <td className="p-4">
                                     <div className="flex items-center space-x-3 text-eburon-muted">
                                        <button className="hover:text-brand-teal" title="Re-index"><RefreshCw size={16}/></button>
                                        <button className="hover:text-danger" title="Remove"><Trash2 size={16}/></button>
                                        <button className="hover:text-eburon-text" title="More"><MoreVertical size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="mt-8 text-center">
                <p className="text-eburon-muted">Drag and drop files, paste a URL, or enter text to import.</p>
            </div>
        </div>
    );
};

export default KnowledgePage;
