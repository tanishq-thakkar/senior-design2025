import { NavLink } from 'react-router-dom'
import clsx from 'classnames'
import {
  MessageSquare,
  History,
  Settings,
  BookOpen,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import type {
  ProviderConnection,
  ProviderKey,
  ProviderStatus,
} from '../../types/api'

const navItems = [
  { label: 'Chat', to: '/chat', icon: MessageSquare },
  { label: 'History', to: '/history', icon: History },
  { label: 'Settings', to: '/settings', icon: Settings },
  { label: 'Docs / Help', to: '/docs', icon: BookOpen },
]

const providerLabels: Record<ProviderKey, string> = {
  google: 'Google Calendar',
  microsoft: 'Microsoft Calendar',
  canvas: 'Canvas LMS',
}

type SidebarProps = {
  providers: ProviderStatus
  connections: ProviderConnection[]
  onConnect: (provider: ProviderKey) => Promise<unknown>
  onDisconnect: (provider: ProviderKey) => Promise<unknown>
}

const Sidebar = ({
  providers,
  connections,
  onConnect,
  onDisconnect,
}: SidebarProps) => {
  const renderStatus = (connection: ProviderConnection) => {
    const connected = connection.connected
    return (
      <div
        key={connection.provider}
        className="rounded-xl border border-border/40 bg-surface/60 p-3"
      >
        <div className="flex items-center justify-between text-sm font-medium">
          <span>{providerLabels[connection.provider]}</span>
          {connected ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <p className="mt-1 text-xs text-textSecondary">
          {connected
            ? `Last sync ${connection.lastSync ? new Date(connection.lastSync).toLocaleTimeString() : 'just now'}`
            : 'Not connected'}
        </p>
        <button
          className={clsx(
            'mt-2 w-full rounded-lg px-3 py-1.5 text-sm font-medium transition',
            connected
              ? 'bg-border/40 text-textSecondary hover:bg-border/60'
              : 'bg-accent text-background hover:bg-accent/90',
          )}
          onClick={() =>
            connected
              ? onDisconnect(connection.provider)
              : onConnect(connection.provider)
          }
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>
    )
  }

  return (
    <aside className="flex w-72 flex-col border-r border-border/40 bg-surface/60 px-4 py-6">
      <div className="px-2">
        <p className="text-xs uppercase tracking-widest text-textSecondary">
          UniSync
        </p>
        <h1 className="text-2xl font-semibold text-textPrimary">Assistant</h1>
      </div>
      <nav className="mt-8 flex flex-col gap-1">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-textSecondary hover:bg-surface hover:text-textPrimary',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-8 space-y-3">
        <p className="text-xs uppercase tracking-widest text-textSecondary">
          Connections
        </p>
        {connections.length
          ? connections.map(renderStatus)
          : (Object.keys(providers) as ProviderKey[]).map((key) =>
              renderStatus({
                provider: key,
                connected: providers[key],
                lastSync: null,
              }),
            )}
      </div>
      <div className="mt-auto rounded-xl border border-border/30 bg-surface/80 p-4 text-xs text-textSecondary">
        <p className="font-semibold text-textPrimary">FERPA safe</p>
        <p className="mt-1 leading-relaxed">
          UniSync only uses your own academic data. Disconnect any provider at
          any time.
        </p>
      </div>
    </aside>
  )
}

export default Sidebar

