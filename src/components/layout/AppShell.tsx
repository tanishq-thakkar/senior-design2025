import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import type {
  MeResponse,
  ProviderConnection,
  ProviderKey,
  ProviderStatus,
} from '../../types/api'

type AppShellProps = {
  user: NonNullable<MeResponse['user']>
  providers: ProviderStatus
  connections: ProviderConnection[]
  onConnect: (provider: ProviderKey) => Promise<unknown>
  onDisconnect: (provider: ProviderKey) => Promise<unknown>
}

const AppShell = ({
  user,
  providers,
  connections,
  onConnect,
  onDisconnect,
}: AppShellProps) => {
  return (
    <div className="flex min-h-screen bg-background text-textPrimary">
      <Sidebar
        providers={providers}
        connections={connections}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
      <div className="flex flex-1 flex-col">
        <TopBar user={user} />
        <main className="flex-1 overflow-y-auto bg-surface/60 px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppShell

