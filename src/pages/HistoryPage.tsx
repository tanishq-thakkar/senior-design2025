import { useEffect } from 'react'
import ChatWindow from '../components/chat/ChatWindow'
import HistoryList from '../components/history/HistoryList'
import { useSessions } from '../hooks/useSessions'

const HistoryPage = () => {
  const { sessions, selectedSession, selectSession, isLoading } = useSessions()

  useEffect(() => {
    if (!selectedSession && sessions.length) {
      void selectSession(sessions[0].id)
    }
  }, [selectedSession, sessions, selectSession])

  return (
    <div className="flex h-[calc(100vh-160px)] gap-6">
      <div className="flex w-80 flex-col rounded-3xl border border-border/40 bg-background/40 p-4">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-textSecondary">
          Sessions
        </h3>
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-textSecondary">
            Loading sessions…
          </div>
        ) : (
          <HistoryList
            sessions={sessions}
            activeId={selectedSession?.id}
            onSelect={(id) => selectSession(id)}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4">
        <div className="rounded-3xl border border-border/40 bg-background/30 p-4">
          <h2 className="text-2xl font-semibold text-textPrimary">
            {selectedSession?.title ?? 'Select a session'}
          </h2>
          <p className="text-sm text-textSecondary">
            Review entire conversations and re-open them in chat later.
          </p>
        </div>
        <ChatWindow
          messages={selectedSession?.messages ?? []}
          streamingMessage={null}
        />
      </div>
    </div>
  )
}

export default HistoryPage

