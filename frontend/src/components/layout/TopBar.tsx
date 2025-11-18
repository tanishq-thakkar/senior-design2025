import { Bell, ChevronDown } from 'lucide-react'
import type { MeResponse } from '../../types/api'

type TopBarProps = {
  user: NonNullable<MeResponse['user']>
}

const TopBar = ({ user }: TopBarProps) => {
  const initials = user.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="flex items-center justify-between border-b border-border/40 bg-surface px-6 py-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-textSecondary">
          UniSync
        </p>
        <h2 className="text-lg font-semibold text-textPrimary">
          AI Assistant for UC Students
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded-full border border-border/40 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-textSecondary">
          MVP
        </button>
        <button className="rounded-full border border-border/40 p-2 text-textSecondary hover:text-textPrimary">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 rounded-full border border-border/40 bg-surface/80 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-textPrimary">{user.name}</p>
            <p className="text-xs text-textSecondary">{user.email}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-textSecondary" />
        </div>
      </div>
    </header>
  )
}

export default TopBar

