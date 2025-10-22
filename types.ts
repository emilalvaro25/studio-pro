export type View = 'Home' | 'Agents' | 'Calls' | 'Knowledge' | 'Voices' | 'Deploy' | 'Settings' | 'AgentBuilder';

export type AgentStatus = 'Draft' | 'Ready' | 'Live';
export type AgentTool = 'Knowledge' | 'Webhook' | 'Calendar' | 'Payments';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  language: string;
  voice: string;
  updatedAt: string;
  personaShortText: string;
  persona: string;
  tools: AgentTool[];
}

export interface TranscriptLine {
  speaker: 'You' | 'Agent' | 'System';
  text: string;
  timestamp: number;
}