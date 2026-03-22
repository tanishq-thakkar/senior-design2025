export type SourceType = 'canvas' | 'calendar' | 'email' | 'events';

export interface SourceSection {
  type: SourceType;
  title: string;
  items: SourceItem[];
}

export interface SourceItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  course?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: SourceSection[];
  confidence?: "high" | "partial";
  lastSynced?: string;
  sourcesChecked?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: Message[];
}

export interface Integration {
  id: string;
  name: string;
  icon: string;
  status: 'connected' | 'pending' | 'not_connected';
  lastSync?: Date;
  permissions: string[];
}

export interface TimelineItem {
  id: string;
  type: 'class' | 'deadline' | 'meeting' | 'event';
  title: string;
  time: string;
  date: Date;
  source: SourceType;
  course?: string;
  location?: string;
}
