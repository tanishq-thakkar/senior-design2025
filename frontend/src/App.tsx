import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAuth } from './hooks/useAuth'
import AppShell from './components/layout/AppShell'
import ChatPage from './pages/ChatPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'
import LoginPage from './pages/LoginPage'

const queryClient = new QueryClient()

const LoadingScreen = ({ message }: { message: string }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background text-textPrimary">
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
    <p className="mt-4 text-sm text-textSecondary">{message}</p>
  </div>
)

const AppRoutes = () => {
  const {
    user,
    providers,
    connections,
    isLoading,
    signInWithProvider,
    connectProvider,
    disconnectProvider,
  } = useAuth()

  const isAuthenticated = useMemo(() => Boolean(user), [user])

  if (isLoading) {
    return <LoadingScreen message="Checking your UniSync session..." />
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<LoginPage onSignIn={signInWithProvider} />}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route
        element={
          <AppShell
            user={user!}
            providers={providers}
            connections={connections}
            onConnect={connectProvider}
            onDisconnect={disconnectProvider}
          />
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/docs" element={<div className="p-6">Docs coming soon</div>} />
      </Route>
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

