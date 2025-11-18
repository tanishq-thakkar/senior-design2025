export type ProviderKey = 'google' | 'microsoft' | 'canvas'

export interface ProviderStatus {
  google: boolean
  microsoft: boolean
  canvas: boolean
}

export type ProviderSyncMap = Record<ProviderKey, string | null>

export interface MeResponse {
  user: {
    id: string
    name: string
    email: string
  } | null
  providers: {
    google: boolean
    microsoft: boolean
    canvas: boolean
  }
}

export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  meta?: {
    sources?: string[]
    type?: 'text' | 'card'
    title?: string
    items?: Array<{ label: string; value: string }>
  }
}

export interface ChatRequest {
  message: string
  sessionId?: string
}

export interface ChatResponse {
  sessionId: string
  messages: ChatMessage[]
}

export interface SessionSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface SessionDetail {
  id: string
  title: string
  messages: ChatMessage[]
}

export interface ProviderConnection {
  provider: ProviderKey
  connected: boolean
  lastSync: string | null
}

