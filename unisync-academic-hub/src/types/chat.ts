export type SourceType = 'canvas' | 'calendar' | 'email' | 'events' | 'chat_history';

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

export interface ReasoningStep {
  label: string;
  detail: string;
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
  reasoningSummary?: ReasoningStep[];
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

export interface PrivacyUsageResponse {
  totalConversations: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  localStorageKeysExpected: string[];
  backendStores: string[];
  llmProvider: string;
  modelUsed: string;
  retentionNote: string;
  exportedAt: string;
}

export interface PrivacyExportResponse {
  exportedAt: string;
  settingsHint: string;
  usage: PrivacyUsageResponse;
  conversations: Conversation[];
}