import { useState, useCallback } from 'react'
import { batch } from '../src/batch'
import type { BatchCall, BatchResult } from '../src/types'

interface UseAtomicBatchReturn {
  batch: (calls: BatchCall[]) => Promise<BatchResult>
  isLoading: boolean
  error: Error | null
  lastResult: BatchResult | null
}

export function useAtomicBatch(): UseAtomicBatchReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastResult, setLastResult] = useState<BatchResult | null>(null)

  const handleBatch = useCallback(async (calls: BatchCall[]) => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await batch(calls)
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

  return { batch: handleBatch, isLoading, error, lastResult }
}
