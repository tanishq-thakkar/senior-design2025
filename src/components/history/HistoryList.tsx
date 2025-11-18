import clsx from 'classnames'
import type { SessionSummary } from '../../types/api'

type HistoryListProps = {
  sessions: SessionSummary[]
  activeId?: string
  onSelect: (id: string) => void
}

const HistoryList = ({ sessions, activeId, onSelect }: HistoryListProps) => {
  if (!sessions.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-center text-textSecondary">
        <p>No sessions yet. Start a conversation to see history here.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-1 flex-col overflow-y-auto">
      {sessions.map((session) => (
        <li key={session.id}>
          <button
            onClick={() => onSelect(session.id)}
            className={clsx(
              'flex w-full flex-col gap-1 rounded-2xl border border-transparent px-4 py-3 text-left transition hover:border-border/40',
              activeId === session.id
                ? 'bg-accent/10 text-textPrimary'
                : 'text-textSecondary',
            )}
          >
            <span className="text-sm font-semibold text-textPrimary">
              {session.title || 'Untitled session'}
            </span>
            <span className="text-xs text-textSecondary">
              {session.updatedAt
                ? new Date(session.updatedAt).toLocaleString()
                : 'Unknown'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default HistoryList

