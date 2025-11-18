import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectProvider,
  disconnectProvider,
  fetchConnections,
  fetchMe,
  signInWith,
} from '../api/authApi'
import type {
  MeResponse,
  ProviderConnection,
  ProviderKey,
  ProviderStatus,
} from '../types/api'

type UseAuthReturn = {
  user: MeResponse['user']
  providers: ProviderStatus
  connections: ProviderConnection[]
  isLoading: boolean
  signInWithProvider: (provider: ProviderKey) => Promise<unknown>
  connectProvider: (provider: ProviderKey) => Promise<unknown>
  disconnectProvider: (provider: ProviderKey) => Promise<unknown>
  refetch: () => Promise<MeResponse>
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 1000 * 60,
  })

  const connectionsQuery = useQuery({
    queryKey: ['auth', 'connections'],
    queryFn: fetchConnections,
    staleTime: 1000 * 30,
  })

  const invalidateAuth = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
      queryClient.invalidateQueries({ queryKey: ['auth', 'connections'] }),
    ])

  const signInMutation = useMutation({
    mutationFn: (provider: ProviderKey) => signInWith(provider),
    onSuccess: () => invalidateAuth(),
  })

  const connectMutation = useMutation({
    mutationFn: (provider: ProviderKey) => connectProvider(provider),
    onSuccess: () => invalidateAuth(),
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: ProviderKey) => disconnectProvider(provider),
    onSuccess: () => invalidateAuth(),
  })

  return {
    user: meQuery.data?.user ?? null,
    providers: meQuery.data?.providers ?? {
      google: false,
      microsoft: false,
      canvas: false,
    },
    connections: connectionsQuery.data ?? [],
    isLoading: meQuery.isLoading || connectionsQuery.isLoading,
    signInWithProvider: (provider: ProviderKey) =>
      signInMutation.mutateAsync(provider),
    connectProvider: (provider: ProviderKey) =>
      connectMutation.mutateAsync(provider),
    disconnectProvider: (provider: ProviderKey) =>
      disconnectMutation.mutateAsync(provider),
    refetch: () => meQuery.refetch().then((res) => res.data ?? fetchMe()),
  }
}

