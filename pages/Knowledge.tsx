import React, { useState, Fragment } from 'react';
import { Plus, Upload, MoreVertical, RefreshCw, Trash2, Search, X, Loader2, UploadCloud } from 'lucide-react';
import { useAppContext } from '../App';

interface KnowledgeBase {
    id: number;
    source: string;
    chunks: number;
    status: 'Indexed' | 'Indexing...';
    updated: string;
}

const initialKnowledgeBases: KnowledgeBase[] = [
    { id: 4, source: 'Hyper-Realistic AI CSR KB.docx', chunks: 128, status: 'Indexed', updated: 'Just now' },
    { id: 1, source: 'Airlines FAQ.pdf', chunks: 152, status: 'Indexed', updated: '2 hours ago' },
    { id: 2, source: 'https://bank.example/terms', chunks: 88, status: 'Indexed', updated: '1 day ago' },
    { id: 3, source: 'Telecom Plans 2024.docx', chunks: 210, status: 'Indexed', updated: '5 minutes ago' },
];

const KnowledgeBaseDetailsDrawer: React.FC<{ kb: KnowledgeBase; onClose: () => void; }> = ({ kb, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchResults([]);

        setTimeout(() => {
            setSearchResults([
                `Found relevant chunk about "${searchQuery}" in section 3, page 12.`,
                `Another reference to "${searchQuery}" appears in the summary.`,
                `The term "${searchQuery}" is defined in the glossary.`,
            ]);
            setIsSearching(false);
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex justify-end" onClick={onClose}>
            <div 
                className="w-full max-w-lg bg-eburon-card border-l border-eburon-border shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-eburon-border flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-eburon-text">Knowledge Base Details</h2>
                        <p className="text-sm text-eburon-muted truncate" title={kb.source}>{kb.source}</p>
                    </div>
                    <button onClick={onClose} className="text-eburon-muted hover:text-eburon-text"><X size={24} /></button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="font-semibold text-eburon-text mb-3">Ask KB</h3>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Ask a question about this document..."
                                className="flex-1 bg-eburon-bg border border-eburon-border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-teal focus:outline-none"
                            />
                            <button
                                type="submit"
                                disabled={isSearching || !searchQuery.trim()}
                                className="flex items-center justify-center space-x-2 bg-brand-teal text-eburon-bg font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                <span>Search</span>
                            </button>
                        </form>
                    </div>

                    <div className="min-h-[100px]">
                        {isSearching && (
                            <div className="flex items-center justify-center pt-4 text-eburon-muted">
                                <Loader2 size={24} className="animate-spin mr-2"/>
                                Searching...
                            </div>
                        )}
                        {!isSearching && searchResults.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-eburon-muted">Search Results:</h4>
                                <ul className="list-disc list-inside space-y-2 text-sm text-eburon-text bg-eburon-bg p-3 rounded-lg border border-eburon-border">
                                    {searchResults.map((result, i) => (
                                        <li key={i}>{result}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    
                    <div>
                         <h3 className="font-semibold text-eburon-text mb-3">Chunk Preview</h3>
                         <div className="space-y-4 text-xs text-eburon-muted bg-eburon-bg p-4 rounded-lg border border-eburon-border">
                            <p className="border-b border-eburon-border pb-2"><strong>Chunk 1:</strong> Turkish Airlines provides a generous baggage allowance for all its passengers. For international flights, Economy Class passengers are typically allowed two checked bags, each weighing up to 23 kg (50 lbs)...</p>
                            <p className="border-b border-eburon-border pb-2"><strong>Chunk 2:</strong> In the event of delayed or lost baggage, passengers should immediately file a Property Irregularity Report (PIR) at the Lost and Found office at the arrival airport. This report is essential for tracing the baggage...</p>
                            <p><strong>Chunk 3:</strong> Miles&Smiles is the frequent flyer program of Turkish Airlines. Members can earn miles from flights with Turkish Airlines, AnadoluJet, and other Star Alliance member airlines. Miles can be redeemed for award tickets...</p>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KnowledgePage: React.FC = () => {
    const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>(initialKnowledgeBases);
    const [selectedKb, setSelectedKb] = useState<KnowledgeBase | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const { addNotification } = useAppContext();

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            addNotification(`Uploading "${file.name}"...`, 'info');
            const newKb: KnowledgeBase = {
                id: Date.now(),
                source: file.name,
                chunks: 0,
                status: 'Indexing...',
                updated: 'Just now',
            };
            setKnowledgeBases(prev => [newKb, ...prev]);

            // Simulate the indexing process
            setTimeout(() => {
                setKnowledgeBases(prev => prev.map(kb => 
                    kb.id === newKb.id 
                    ? { ...kb, status: 'Indexed', chunks: Math.floor(Math.random() * 200) + 50 } 
                    : kb
                ));
                 addNotification(`"${newKb.source}" has been successfully indexed.`, 'success');
            }, 3000);
        }
    };


    return (
        <Fragment>
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
                                <tr key={kb.id} className="hover:bg-white/5 cursor-pointer" onClick={() => setSelectedKb(kb)}>
                                    <td className="p-4 font-semibold text-eburon-text">{kb.source}</td>
                                    <td className="p-4 text-eburon-muted">{kb.chunks}</td>
                                    <td className="p-4 text-eburon-muted">
                                        <span className={`flex items-center space-x-2 ${kb.status === 'Indexing...' ? 'text-warn' : 'text-ok'}`}>
                                            {kb.status === 'Indexing...' && <Loader2 size={14} className="animate-spin" />}
                                            <span>{kb.status}</span>
                                        </span>
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
                 <div 
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`mt-8 text-center p-10 border-2 border-dashed rounded-xl transition-colors ${
                        isDragging 
                        ? 'border-brand-teal bg-brand-teal/10' 
                        : 'border-eburon-border hover:border-eburon-muted/50'
                    }`}
                >
                    <UploadCloud size={32} className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-brand-teal' : 'text-eburon-muted'}`} />
                    <p className={`font-semibold transition-colors ${isDragging ? 'text-brand-teal' : 'text-eburon-text'}`}>
                        Drag and drop files here
                    </p>
                    <p className="text-eburon-muted text-sm">PDF, DOCX, or text files are supported.</p>
                </div>
            </div>
            {selectedKb && <KnowledgeBaseDetailsDrawer kb={selectedKb} onClose={() => setSelectedKb(null)} />}
        </Fragment>
    );
};

export default KnowledgePage;