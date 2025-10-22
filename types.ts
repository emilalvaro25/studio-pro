import { Blob } from 'buffer';

export type View = 'Home' | 'Agents' | 'Templates' | 'Calls' | 'Knowledge' | 'Voices' | 'Deploy' | 'Integrations' | 'Settings' | 'AgentBuilder' | 'CallHistory' | 'Database' | 'Profile';

export type AgentStatus = 'Draft' | 'Ready' | 'Live';
export type AgentTool = 'Knowledge' | 'Webhook' | 'Calendar' | 'Payments' | 'Salesforce Lookup' | 'HubSpot Update';

export type IntroSpielType = 'Concise' | 'Warm' | 'Custom';

export interface IntroSpiel {
  type: IntroSpielType;
  customText?: string;
}

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
  voiceDescription: string;
  personaShortText: string;
  persona: string;
  tools: AgentTool[];
  introSpiel: IntroSpiel;
}


export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  language: string;
  voice: string;
  voiceDescription: string;
  updatedAt: string; // This will now reflect the last save/restore time
  personaShortText: string;
  persona: string;
  tools: AgentTool[];
  history: AgentVersion[];
  introSpiel: IntroSpiel;
}

export interface TemplateAgent extends Omit<Agent, 'id' | 'history' | 'updatedAt' | 'status'> {
  category: string;
  company: string;
}

export type NotificationType = 'success' | 'error' | 'info' | 'warn';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
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

export type KnowledgeBaseStatus = 'Indexing...' | 'Indexed' | 'Failed';

export interface KnowledgeBase {
  id: string;
  sourceName: string;
  storagePath: string;
  chunks: number | null;
  status: KnowledgeBaseStatus;
  updatedAt: string;
}


export type Theme = 'light' | 'dark';