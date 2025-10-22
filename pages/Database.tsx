import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useAppContext } from '../App';

const schemaContent = `-- Eburon CSR Studio Supabase Schema
-- Version 1.0

-- This script provides all the necessary SQL commands to set up the database schema
-- for the Eburon CSR Studio application on a Supabase (PostgreSQL) instance.

-- 1. Create custom types for status enums to ensure data consistency.
CREATE TYPE agent_status AS ENUM ('Draft', 'Ready', 'Live');
CREATE TYPE kb_status AS ENUM ('Indexing...', 'Indexed', 'Failed');

-- 2. Create the main 'agents' table to store core agent configurations.
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status agent_status DEFAULT 'Draft',
    language TEXT DEFAULT 'Multilingual',
    voice TEXT NOT NULL,
    voice_description TEXT,
    persona_short_text TEXT,
    persona TEXT NOT NULL,
    tools JSONB, -- Example: ["Knowledge", "Webhook"]
    intro_spiel JSONB, -- Example: {"type": "Warm", "customText": null}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) for the agents table.
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
-- Example policy: Allow public read-only access. Modify as needed for your auth rules.
CREATE POLICY "Allow public read access to agents" ON agents FOR SELECT USING (true);


-- 3. Create 'agent_versions' to track changes to each agent over time.
CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- This section is a snapshot of the agent's properties at the time of versioning.
    name TEXT NOT NULL,
    status agent_status NOT NULL,
    language TEXT NOT NULL,
    voice TEXT NOT NULL,
    voice_description TEXT,
    persona_short_text TEXT,
    persona TEXT NOT NULL,
    tools JSONB,
    intro_spiel JSONB,

    UNIQUE(agent_id, version_number) -- Ensure version numbers are unique per agent.
);

ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to versions" ON agent_versions FOR SELECT USING (true);


-- 4. Create 'call_history' to log all test and deployment calls.
CREATE TABLE call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL, -- Denormalized for easier access
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_ms INT NOT NULL,
    transcript JSONB,
    recording_url TEXT -- This will be a URL to a file in Supabase Storage.
);

ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to call history" ON call_history FOR SELECT USING (true);


-- 5. Create 'knowledge_bases' to store information about uploaded documents.
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name TEXT NOT NULL, -- e.g., "Airlines FAQ.pdf"
    storage_path TEXT NOT NULL, -- e.g., "public/knowledge_files/airlines_faq.pdf"
    chunks INT,
    status kb_status DEFAULT 'Indexing...',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to KBs" ON knowledge_bases FOR SELECT USING (true);


-- 6. Create a link table for the many-to-many relationship between agents and knowledge bases.
CREATE TABLE agent_knowledge_links (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, kb_id)
);

ALTER TABLE agent_knowledge_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to KB links" ON agent_knowledge_links FOR SELECT USING (true);


-- 7. Recommendations for Supabase Storage setup (to be done in the Supabase Dashboard)
--
--  a. Create a bucket named 'call_recordings' for storing audio files from calls.
--     - Consider making it a private bucket if recordings are sensitive.
--     - Set up storage policies to allow your application to upload files and generate
--       time-limited signed URLs for playback.
--
--  b. Create a bucket named 'knowledge_files' for storing uploaded knowledge documents.
--     - This can be a public or private bucket depending on the sensitivity of the data.
--     - Set up storage policies for upload and download access.

-- End of schema.`;

const DatabasePage: React.FC = () => {
    const { addNotification } = useAppContext();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(schemaContent.trim());
        addNotification('Schema copied to clipboard', 'success');
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h1 className="text-xl font-semibold text-eburon-text mb-2">Database Schema</h1>
            <p className="text-eburon-muted mb-6">
                Use this SQL schema to set up your Supabase PostgreSQL database. This allows you to own and manage your agent data.
            </p>
            <div className="relative flex-1 bg-eburon-bg border border-eburon-border rounded-xl overflow-hidden">
                <button
                    onClick={copyToClipboard}
                    className="absolute top-3 right-3 flex items-center space-x-2 bg-eburon-border text-eburon-text font-semibold px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
                >
                    <Copy size={16} />
                    <span>Copy Schema</span>
                </button>
                <pre className="h-full w-full overflow-auto p-4 font-mono text-sm text-eburon-text">
                    <code>
                        {schemaContent.trim()}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default DatabasePage;