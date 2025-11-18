import { useEffect, useRef } from 'react'
import type { ChatMessage } from '../../types/api'
import MessageBubble from './MessageBubble'

type ChatWindowProps = {
  messages: ChatMessage[]
  streamingMessage?: ChatMessage | null
}

const ChatWindow = ({ messages, streamingMessage }: ChatWindowProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages, streamingMessage])

  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center text-center text-textSecondary">
      <p className="text-sm uppercase tracking-[0.3em] text-accent">
        UniSync
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-textPrimary">
        How can I help today?
      </h2>
      <p className="mt-2 max-w-md text-sm text-textSecondary">
        Ask about classes, assignments, or events. I’ll search Google Calendar,
        Microsoft Outlook, and Canvas to get you answers faster.
      </p>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto rounded-3xl border border-border/40 bg-background/40 p-6"
    >
      <div className="flex flex-col gap-4">
        {messages.length === 0 && !streamingMessage ? (
          emptyState
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {streamingMessage ? (
              <MessageBubble message={streamingMessage} />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

export default ChatWindow

