import type { ChatMessage, ChatRequest, ChatResponse } from '../types/api'
import { mockRequest, randomId, timestamp } from './client'
import {
  appendMessagesToSession,
  createSessionId,
} from './sessionsApi'

const assistantTemplates = [
  'Here is what I found based on your connected calendars.',
  'I synced Google Calendar and Canvas to get this answer.',
  'This is everything on your radar today.',
]

const sourceSets = [
  ['Google Calendar'],
  ['Google Calendar', 'Canvas'],
  ['Microsoft Calendar', 'Canvas'],
]

function buildAssistantMessage(prompt: string): ChatMessage {
  const template =
    assistantTemplates[Math.floor(Math.random() * assistantTemplates.length)]
  const sources = sourceSets[Math.floor(Math.random() * sourceSets.length)]
  return {
    id: randomId('msg'),
    role: 'assistant',
    content: `${template} ${prompt}`,
    createdAt: timestamp(),
    meta: {
      sources,
      type: Math.random() > 0.5 ? 'card' : 'text',
      title: 'Upcoming items',
      items: [
        { label: 'Next class', value: 'MATH2076 – 10:00 AM' },
        { label: 'Assignment due', value: 'Physics lab report – Friday' },
        { label: 'Study reminder', value: 'AI project sync at 4 PM' },
      ],
    },
  }
}

export async function sendChatMessage(
  payload: ChatRequest,
): Promise<ChatResponse> {
  const sessionId = payload.sessionId ?? createSessionId()
  const userMessage: ChatMessage = {
    id: randomId('msg'),
    role: 'user',
    content: payload.message,
    createdAt: timestamp(),
  }

  const assistantMessage = buildAssistantMessage(payload.message)

  appendMessagesToSession(sessionId, payload.message, [userMessage, assistantMessage])

  return mockRequest(() => ({
    sessionId,
    messages: [userMessage, assistantMessage],
  }))
}

