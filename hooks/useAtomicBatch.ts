/**
 * useAtomicBatch - Execute multiple EVM calls atomically
 * 
 * Wagmi-style hook for batching multiple EVM contract calls into a single
 * transaction with atomic execution (all succeed or all revert).
 */

import { useState, useCallback } from "react"
import { batch as sdkBatch } from "../src/index"
import type { BatchCall, BatchResult } from "../src/types"
import type { UseAtomicBatchConfig, UseAtomicBatchReturn } from "./types"

/**
 * Execute multiple EVM calls atomically with one signature
 * 
 * @example
 * ```tsx
 * function DeFiDeposit() {
 *   const { batch, isLoading, isSuccess, error } = useAtomicBatch({
 *     onSuccess: (result) => {
 *       console.log('Batch executed:', result.txHash)
 *       console.log('All calls succeeded')
 *     },
 *     onError: (error) => {
 *       console.error('Batch failed:', error.message)
 *     }
 *   })
 * 
 *   const handleDeposit = async () => {
 *     // Approve + Deposit in ONE transaction
 *     await batch([
 *       {
 *         contractAddress: USDC_CONTRACT,
 *         calldata: encodeApprove(VAULT_ADDRESS, amount)
 *       },
 *       {
 *         contractAddress: VAULT_CONTRACT,
 *         calldata: encodeDeposit(amount)
 *       }
 *     ])
 *   }
 * 
 *   return (
 *     <button onClick={handleDeposit} disabled={isLoading}>
 *       {isLoading ? 'Processing...' : 'Approve & Deposit'}
 *     </button>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Multi-step DeFi operation
 * await batch([
 *   { contractAddress: TOKEN_A, calldata: encodeApprove(DEX, amountA) },
 *   { contractAddress: TOKEN_B, calldata: encodeApprove(DEX, amountB) },
 *   { contractAddress: DEX, calldata: encodeAddLiquidity(amountA, amountB) }
 * ])
 * // All three calls execute atomically - if addLiquidity fails, approvals revert too
 * ```
 */
export function useAtomicBatch(config: UseAtomicBatchConfig = {}): UseAtomicBatchReturn {
  const [data, setData] = useState<BatchResult | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (calls: BatchCall[], gasLimit?: number): Promise<BatchResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await sdkBatch(calls, gasLimit)
        setData(result)
        config.onSuccess?.(result)
        config.onSettled?.(result, null)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        config.onError?.(error)
        config.onSettled?.(undefined, error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [config]
  )

  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
  }, [])

  return {
    data,
    error,
    isLoading,
    isSuccess: !!data && !error,
    isError: !!error,
    mutate,
    mutateAsync: mutate,
    batch: mutate,
    batchAsync: mutate,
    reset,
  }
}

/**
 * Prepare a batch transaction without executing it
 * Useful for showing gas estimates or validating calls
 * 
 * @example
 * ```tsx
 * function BatchPreview() {
 *   const calls = [
 *     { contractAddress: TOKEN, calldata: encodeApprove(...) },
 *     { contractAddress: VAULT, calldata: encodeDeposit(...) }
 *   ]
 * 
 *   const { data: estimate, isLoading } = usePrepareBatch(calls)
 * 
 *   if (isLoading) return <p>Calculating...</p>
 * 
 *   return (
 *     <div>
 *       <p>Total calls: {calls.length}</p>
 *       <p>Estimated gas: {estimate?.totalGas}</p>
 *       <p>All atomic: {estimate?.isAtomic ? '✓' : '✗'}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePrepareBatch(calls: BatchCall[] | null) {
  const [data, setData] = useState<{ totalGas: number; isAtomic: boolean } | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useState(() => {
    if (!calls || calls.length === 0) return

    setIsLoading(true)
    // Mock gas estimation
    setTimeout(() => {
      setData({
        totalGas: calls.length * 100000,
        isAtomic: true,
      })
      setIsLoading(false)
    }, 100)
  })

  return { data, isLoading, error }
}

/**
 * Hook for common DeFi batch patterns
 * 
 * @example
 * ```tsx
 * function QuickDeposit() {
 *   const { approveAndDeposit, isLoading } = useDeFiBatch()
 * 
 *   const handleDeposit = async () => {
 *     await approveAndDeposit({
 *       token: USDC_CONTRACT,
 *       vault: VAULT_CONTRACT,
 *       amount: '1000'
 *     })
 *   }
 * 
 *   return (
 *     <button onClick={handleDeposit} disabled={isLoading}>
 *       Deposit USDC
 *     </button>
 *   )
 * }
 * ```
 */
export function useDeFiBatch() {
  const { batch, isLoading, error } = useAtomicBatch()

  const approveAndDeposit = useCallback(
    async (params: { token: string; vault: string; amount: string }) => {
      // This is a simplified example - in production, use proper encoding
      const calls: BatchCall[] = [
        {
          contractAddress: params.token,
          calldata: `0xa9059cbb${params.vault.slice(2).padStart(64, "0")}${BigInt(params.amount).toString(16).padStart(64, "0")}`,
        },
        {
          contractAddress: params.vault,
          calldata: `0xd0e30db0`, // deposit()
        },
      ]

      return batch(calls)
    },
    [batch]
  )

  const approveAndSwap = useCallback(
    async (params: { tokenIn: string; tokenOut: string; dex: string; amountIn: string }) => {
      const calls: BatchCall[] = [
        {
          contractAddress: params.tokenIn,
          calldata: `0x095ea7b3${params.dex.slice(2).padStart(64, "0")}${BigInt(params.amountIn).toString(16).padStart(64, "0")}`,
        },
        {
          contractAddress: params.dex,
          calldata: `0x38ed1739`, // swapExactTokensForTokens()
        },
      ]

      return batch(calls)
    },
    [batch]
  )

  return {
    approveAndDeposit,
    approveAndSwap,
    isLoading,
    error,
  }
}
