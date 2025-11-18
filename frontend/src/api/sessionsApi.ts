import { mockRequest, randomId, timestamp } from './client'
import type { ChatMessage, SessionDetail, SessionSummary } from '../types/api'

type SessionRecord = SessionDetail & {
  createdAt: string
  updatedAt: string
}

const sessionStore = new Map<string, SessionRecord>()

function seedSessions() {
  if (sessionStore.size) return
  const now = new Date()
  const sampleMessages: ChatMessage[] = [
    {
      id: randomId('msg'),
      role: 'user',
      content: 'When is my next Calculus class?',
      createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: randomId('msg'),
      role: 'assistant',
      content:
        'Your next Calculus class (MATH2076) is today at 10:00 AM in 60 W Charlton.',
      createdAt: new Date(now.getTime() - 1000 * 60 * 50).toISOString(),
      meta: {
        sources: ['Google Calendar', 'Canvas'],
        type: 'card',
        title: 'Next Class',
        items: [
          { label: 'Course', value: 'MATH2076 - Calculus II' },
          { label: 'Time', value: '10:00 AM – 10:50 AM' },
          { label: 'Location', value: '60 W Charlton (Old Chem)' },
        ],
      },
    },
  ]

  const session: SessionRecord = {
    id: randomId('session'),
    title: 'Next Calculus class',
    messages: sampleMessages,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }
  sessionStore.set(session.id, session)
}

seedSessions()

export async function fetchSessions(): Promise<SessionSummary[]> {
  return mockRequest(() =>
    Array.from(sessionStore.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
  )
}

export async function fetchSessionDetail(id: string): Promise<SessionDetail> {
  return mockRequest(() => {
    const session = sessionStore.get(id)
    if (!session) {
      throw new Error('Session not found')
    }
    return {
      id: session.id,
      title: session.title,
      messages: session.messages,
    }
  })
}

export function appendMessagesToSession(
  sessionId: string,
  title: string,
  messages: ChatMessage[],
) {
  const existing = sessionStore.get(sessionId)
  const now = timestamp()
  if (existing) {
    existing.messages = [...existing.messages, ...messages]
    existing.updatedAt = now
    if (title && existing.title === existing.messages?.[0]?.content) {
      existing.title = title
    }
    sessionStore.set(sessionId, existing)
    return existing
  }

  const newSession: SessionRecord = {
    id: sessionId,
    title: title || messages[0]?.content || 'New session',
    messages,
    createdAt: now,
    updatedAt: now,
  }
  sessionStore.set(sessionId, newSession)
  return newSession
}

export function createSessionId() {
  return randomId('session')
}

