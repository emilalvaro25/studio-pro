import { Blob } from 'buffer';

export type View = 'Home' | 'Agents' | 'Calls' | 'Knowledge' | 'Voices' | 'Deploy' | 'Settings' | 'AgentBuilder' | 'CallHistory';

export type AgentStatus = 'Draft' | 'Ready' | 'Live';
export type AgentTool = 'Knowledge' | 'Webhook' | 'Calendar' | 'Payments';

export interface AgentVersion {
  id: string; // Unique ID for the version, e.g., a timestamp
  versionNumber: number;
  createdAt: string;
  description: string;
  // Snapshot of agent properties
  name: string;
  status: AgentStatus;
  language: string;
  voice: string;
  personaShortText: string;
  persona: string;
  tools: AgentTool[];
}


export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  language: string;
  voice: string;
  updatedAt: string; // This will now reflect the last save/restore time
  personaShortText: string;
  persona: string;
  tools: AgentTool[];
  history: AgentVersion[];
}

export interface TranscriptLine {
  speaker: 'You' | 'Agent' | 'System';
  text: string;
  timestamp: number;
}

export interface CallRecord {
  id: string;
  agentId: string;
  agentName: string;
  startTime: number;
  endTime: number;
  duration: number; // in milliseconds
  transcript: TranscriptLine[];
  recordingUrl: string;
}