import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sendChatMessage } from '../api/chatApi'
import type { ChatMessage, SessionDetail } from '../types/api'
import { randomId } from '../api/client'

const QUICK_PROMPTS = [
  'When is my next class?',
  'What’s due this week?',
  'Show all today’s events.',
  'Summarize my unread Canvas messages.',
]

type UseChatReturn = {
  messages: ChatMessage[]
  activeSessionId?: string
  isSending: boolean
  isStreaming: boolean
  isRecording: boolean
  streamingMessage?: ChatMessage | null
  quickPrompts: string[]
  sendMessage: (message: string) => Promise<void>
  startRecording: () => void
  stopRecording: () => void
  loadSession: (session: SessionDetail) => void
  resetSession: () => void
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>()
  const [isSending, setIsSending] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<ChatMessage | null>(
    null,
  )
  const [isStreaming, setIsStreaming] = useState(false)
  const streamingInterval = useRef<NodeJS.Timeout | null>(null)

  const cleanupStreaming = useCallback(() => {
    if (streamingInterval.current) {
      clearInterval(streamingInterval.current)
      streamingInterval.current = null
    }
    setStreamingMessage(null)
    setIsStreaming(false)
  }, [])

  useEffect(() => cleanupStreaming, [cleanupStreaming])

  const simulateStreaming = useCallback(
    (assistantMessage: ChatMessage) => {
      cleanupStreaming()
      setIsStreaming(true)
      const tokens = assistantMessage.content.split(' ')
      let index = 0
      const baseMessage = { ...assistantMessage, content: '' }
      setStreamingMessage(baseMessage)
      streamingInterval.current = setInterval(() => {
        index += 1
        setStreamingMessage({
          ...assistantMessage,
          content: tokens.slice(0, index).join(' '),
        })
        if (index >= tokens.length) {
          cleanupStreaming()
          setMessages((prev) => [...prev, assistantMessage])
        }
      }, 120)
    },
    [cleanupStreaming],
  )

  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim()) return
      setIsSending(true)
      const userMessage: ChatMessage = {
        id: randomId('msg'),
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      try {
        const response = await sendChatMessage({
          message,
          sessionId: activeSessionId,
        })
        setActiveSessionId(response.sessionId)
        const assistantMessage = response.messages.find(
          (msg) => msg.role === 'assistant',
        )
        if (assistantMessage) {
          simulateStreaming(assistantMessage)
        }
      } catch (error) {
        console.error('Failed to send chat message', error)
      } finally {
        setIsSending(false)
      }
    },
    [activeSessionId, simulateStreaming],
  )

  const startRecording = () => {
    setIsRecording(true)
  }

  const stopRecording = () => {
    setIsRecording(false)
  }

  const loadSession = useCallback((session: SessionDetail) => {
    setActiveSessionId(session.id)
    setMessages(session.messages)
    cleanupStreaming()
  }, [cleanupStreaming])

  const resetSession = () => {
    setActiveSessionId(undefined)
    setMessages([])
    cleanupStreaming()
  }

  return {
    messages,
    activeSessionId,
    isSending,
    isStreaming,
    isRecording,
    streamingMessage,
    quickPrompts: QUICK_PROMPTS,
    sendMessage,
    startRecording,
    stopRecording,
    loadSession,
    resetSession,
  }
}

