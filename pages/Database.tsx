import React from 'react';
import { Copy, Check } from 'lucide-react';
import { useAppContext } from '../App';
import Tooltip from '../components/Tooltip';

const schemaContent = `-- Eburon CSR Studio Supabase Schema
-- Version 1.2 - Added automated timestamp triggers

-- This script provides all the necessary SQL commands to set up the database schema
-- for the Eburon CSR Studio application on a Supabase (PostgreSQL) instance.

-- 1. Create custom types for status enums to ensure data consistency.
CREATE TYPE agent_status AS ENUM ('Draft', 'Ready', 'Live');
CREATE TYPE kb_status AS ENUM ('Indexing...', 'Indexed', 'Failed');

-- 2. Create the main 'agents' table to store core agent configurations.
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own agents" ON agents
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


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
CREATE POLICY "Users can manage versions of their own agents" ON agent_versions
    FOR ALL
    USING ( (SELECT auth.uid() FROM agents WHERE id = agent_versions.agent_id) = auth.uid() )
    WITH CHECK ( (SELECT auth.uid() FROM agents WHERE id = agent_versions.agent_id) = auth.uid() );


-- 4. Create 'call_history' to log all test and deployment calls.
CREATE TABLE call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL, -- Denormalized for easier access
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_ms INT NOT NULL,
    transcript JSONB,
    recording_url TEXT -- This will be a URL to a file in Supabase Storage.
);

ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own call history" ON call_history
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 5. Create 'knowledge_bases' to store information about uploaded documents.
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_name TEXT NOT NULL, -- e.g., "Airlines FAQ.pdf"
    storage_path TEXT NOT NULL, -- e.g., "knowledge_files/user-id/file.pdf"
    chunks INT,
    status kb_status DEFAULT 'Indexing...',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own knowledge bases" ON knowledge_bases
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 6. Create a link table for the many-to-many relationship between agents and knowledge bases.
CREATE TABLE agent_knowledge_links (
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    kb_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, kb_id)
);

ALTER TABLE agent_knowledge_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can link their own agents and KBs" ON agent_knowledge_links
    FOR ALL
    USING (
        (SELECT auth.uid() FROM agents WHERE id = agent_knowledge_links.agent_id) = auth.uid() AND
        (SELECT auth.uid() FROM knowledge_bases WHERE id = agent_knowledge_links.kb_id) = auth.uid()
    )
    WITH CHECK (
        (SELECT auth.uid() FROM agents WHERE id = agent_knowledge_links.agent_id) = auth.uid() AND
        (SELECT auth.uid() FROM knowledge_bases WHERE id = agent_knowledge_links.kb_id) = auth.uid()
    );


-- 7. Recommendations for Supabase Storage setup (to be done in the Supabase Dashboard)
--
--  a. Create one public bucket named 'studio'.
--
--  b. Inside the 'studio' bucket, your application will create and manage folders.
--     - A 'call_recordings' folder will be used for storing audio files from calls.
--     - A 'knowledge_files' folder will be used for uploaded knowledge documents.
--
--  c. Ensure the bucket policies are set for public read access if you want recordings
--     and documents to be easily accessible via their URLs.

-- 8. Create a trigger function to automatically update the 'updated_at' column.
--    This ensures the timestamp is current whenever a row is modified.
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Apply the trigger to tables that have an 'updated_at' column.
--    This keeps the modification time accurate without needing to set it in the application code.

-- Trigger for the 'agents' table
CREATE TRIGGER on_agents_update
BEFORE UPDATE ON agents
FOR EACH ROW
EXECUTE PROCEDURE handle_updated_at();

-- Trigger for the 'knowledge_bases' table
CREATE TRIGGER on_knowledge_bases_update
BEFORE UPDATE ON knowledge_bases
FOR EACH ROW
EXECUTE PROCEDURE handle_updated_at();

-- End of schema.`;

const DatabasePage: React.FC = () => {
    const { addNotification } = useAppContext();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(schemaContent.trim());
        addNotification('Schema copied to clipboard', 'success');
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <h1 className="text-xl font-semibold text-text mb-2">Database Schema</h1>
            <p className="text-subtle mb-6">
                Use this SQL schema to set up your Supabase PostgreSQL database. This allows you to own and manage your agent data.
            </p>
            <div className="relative flex-1 bg-surface border border-border rounded-xl overflow-hidden">
                <Tooltip text="Copy Schema">
                    <button
                        onClick={copyToClipboard}
                        className="absolute top-3 right-3 flex items-center space-x-2 bg-panel text-text font-semibold px-3 py-1.5 rounded-lg hover:bg-border transition-colors z-10"
                    >
                        <Copy size={16} />
                    </button>
                </Tooltip>
                <pre className="h-full w-full overflow-auto p-4 font-mono text-sm text-text">
                    <code>
                        {schemaContent.trim()}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default DatabasePage;