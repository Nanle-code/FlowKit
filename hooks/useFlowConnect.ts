import { useState, useCallback } from 'react'
import { connect, disconnect } from '../src/client'
import { useFlowKit } from './FlowKitProvider'
import type { ConnectOptions, FlowKitUser } from '../src/types'

interface UseFlowConnectReturn {
  connect: (options?: ConnectOptions) => Promise<FlowKitUser>
  disconnect: () => Promise<void>
  user: FlowKitUser | null
  isConnected: boolean
  isLoading: boolean
  error: Error | null
}

export function useFlowConnect(): UseFlowConnectReturn {
  const { user, isConnected } = useFlowKit()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleConnect = useCallback(async (options?: ConnectOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await connect(options ?? { withEVM: true })
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDisconnect = useCallback(async () => {
    setIsLoading(true)
    try {
      await disconnect()
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    connect: handleConnect,
    disconnect: handleDisconnect,
    user,
    isConnected,
    isLoading,
    error,
  }
}
