import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchSessionDetail, fetchSessions } from '../api/sessionsApi'
import type { SessionDetail, SessionSummary } from '../types/api'

type UseSessionsReturn = {
  sessions: SessionSummary[]
  selectedSession?: SessionDetail
  isLoading: boolean
  selectSession: (id: string) => Promise<SessionDetail | undefined>
  refreshSessions: () => Promise<SessionSummary[] | undefined>
}

export function useSessions(): UseSessionsReturn {
  const [selectedId, setSelectedId] = useState<string>()
  const queryClient = useQueryClient()

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    staleTime: 1000 * 60,
  })

  const selectedSessionQuery = useQuery({
    queryKey: ['sessions', selectedId],
    queryFn: () => fetchSessionDetail(selectedId as string),
    enabled: Boolean(selectedId),
  })

  const selectSession = useCallback(
    async (id: string) => {
      setSelectedId(id)
      const detail = await queryClient.fetchQuery({
        queryKey: ['sessions', id],
        queryFn: () => fetchSessionDetail(id),
      })
      return detail
    },
    [queryClient],
  )

  const refreshSessions = useCallback(async () => {
    const data = await sessionsQuery.refetch()
    return data.data
  }, [sessionsQuery])

  return {
    sessions: sessionsQuery.data ?? [],
    selectedSession: selectedSessionQuery.data,
    isLoading: sessionsQuery.isLoading,
    selectSession,
    refreshSessions,
  }
}

