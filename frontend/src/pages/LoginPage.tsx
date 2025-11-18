import { useState } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import type { ProviderKey } from '../types/api'

type LoginPageProps = {
  onSignIn: (provider: ProviderKey) => Promise<unknown>
}

const LoginPage = ({ onSignIn }: LoginPageProps) => {
  const [loadingProvider, setLoadingProvider] = useState<ProviderKey | null>(null)

  const handleSignIn = async (provider: ProviderKey) => {
    try {
      setLoadingProvider(provider)
      await onSignIn(provider)
    } finally {
      setLoadingProvider(null)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12 text-textPrimary">
      <div className="w-full max-w-md rounded-3xl border border-border/40 bg-surface/80 p-8 shadow-card">
        <p className="text-xs uppercase tracking-[0.3em] text-textSecondary">
          UniSync
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Sign in to your UC assistant
        </h1>
        <p className="mt-2 text-sm text-textSecondary">
          Use your university Google or Microsoft account. We will redirect you
          through AWS Cognito for secure OAuth.
        </p>
        <div className="mt-8 space-y-4">
          <button
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm font-semibold text-textPrimary transition hover:border-accent hover:text-accent"
            onClick={() => handleSignIn('google')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign in with Google
          </button>
          <button
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border/50 bg-background/40 px-4 py-3 text-sm font-semibold text-textPrimary transition hover:border-accent hover:text-accent"
            onClick={() => handleSignIn('microsoft')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'microsoft' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign in with Microsoft
          </button>
        </div>
        <p className="mt-6 text-center text-xs text-textSecondary">
          Canvas connections can be added from settings after you sign in.
        </p>
      </div>
    </div>
  )
}

export default LoginPage

