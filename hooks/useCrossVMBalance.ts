import { useState, useEffect, useCallback } from 'react'
import { balance } from '../src/balance'
import type { AnyAddress, BalanceResult } from '../src/types'

interface UseCrossVMBalanceConfig {
  /** Auto-refresh interval in ms. Default: no auto-refresh. */
  refetchInterval?: number
  /** Whether to fetch on mount. Default: true */
  enabled?: boolean
}

interface UseCrossVMBalanceReturn {
  balance: BalanceResult | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useCrossVMBalance(
  address: AnyAddress | undefined,
  _token?: string,
  config: UseCrossVMBalanceConfig = {}
): UseCrossVMBalanceReturn {
  const { refetchInterval, enabled = true } = config
  const [data, setData] = useState<BalanceResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!address || !enabled) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await balance(address)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
    }
  }, [address, enabled])

  // Initial fetch
  useEffect(() => { fetch() }, [fetch])

  // Auto-refresh
  useEffect(() => {
    if (!refetchInterval) return
    const id = setInterval(fetch, refetchInterval)
    return () => clearInterval(id)
  }, [fetch, refetchInterval])

  return { balance: data, isLoading, error, refetch: fetch }
}
