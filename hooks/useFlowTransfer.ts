import { useState, useCallback } from 'react'
import { transfer } from '../src/transfer'
import type { TransferParams, TransferResult } from '../src/types'

interface UseFlowTransferReturn {
  transfer: (params: TransferParams) => Promise<TransferResult>
  isLoading: boolean
  error: Error | null
  lastResult: TransferResult | null
  reset: () => void
}

export function useFlowTransfer(): UseFlowTransferReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastResult, setLastResult] = useState<TransferResult | null>(null)

  const handleTransfer = useCallback(async (params: TransferParams) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await transfer(params)
      setLastResult(result)
      return result
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setError(null)
    setLastResult(null)
  }, [])

  return { transfer: handleTransfer, isLoading, error, lastResult, reset }
}
