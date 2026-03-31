/**
 * useFlowTransfer - Multi-token cross-VM transfer hook
 * 
 * Wagmi-style hook for transferring FLOW, USDC, USDT, or custom tokens
 * across Cadence and EVM with automatic routing.
 */

import { useState, useCallback } from "react"
import { transfer as sdkTransfer } from "../src/index"
import type { TransferParams, TransferResult } from "../src/types"
import type { UseFlowTransferConfig, UseFlowTransferReturn } from "./types"

/**
 * Transfer any fungible token across Flow's Cadence and EVM
 * 
 * @example
 * ```tsx
 * function TransferForm() {
 *   const { transfer, isLoading, isSuccess, error } = useFlowTransfer({
 *     onSuccess: (result) => {
 *       console.log('Transfer complete:', result.txHash)
 *       console.log('Route:', result.route)
 *     },
 *     onError: (error) => {
 *       console.error('Transfer failed:', error.message)
 *     }
 *   })
 * 
 *   const handleTransfer = async () => {
 *     await transfer({
 *       token: 'USDC',
 *       amount: '100.50',
 *       to: '0xRecipient...'
 *     })
 *   }
 * 
 *   return (
 *     <div>
 *       <button onClick={handleTransfer} disabled={isLoading}>
 *         {isLoading ? 'Transferring...' : 'Transfer USDC'}
 *       </button>
 *       {isSuccess && <p>✓ Transfer successful!</p>}
 *       {error && <p>✗ {error.message}</p>}
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Cross-VM transfer (Cadence → EVM)
 * await transfer({
 *   token: 'USDC',
 *   amount: '50',
 *   to: '0xEVMAddress...'  // Auto-detects EVM and bridges
 * })
 * 
 * // Custom ERC-20 token
 * await transfer({
 *   token: '0x1234567890123456789012345678901234567890',
 *   amount: '25',
 *   to: '0xRecipient...'
 * })
 * ```
 */
export function useFlowTransfer(config: UseFlowTransferConfig = {}): UseFlowTransferReturn {
  const [data, setData] = useState<TransferResult | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (params: TransferParams): Promise<TransferResult> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await sdkTransfer(params)
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
    transfer: mutate,
    transferAsync: mutate,
    reset,
  }
}

/**
 * Prepare a transfer without executing it
 * Useful for showing gas estimates or validating parameters
 * 
 * @example
 * ```tsx
 * function TransferPreview() {
 *   const { data: estimate, isLoading } = usePrepareTransfer({
 *     token: 'USDC',
 *     amount: '100',
 *     to: '0xRecipient...'
 *   })
 * 
 *   if (isLoading) return <p>Calculating...</p>
 * 
 *   return (
 *     <div>
 *       <p>Route: {estimate?.route}</p>
 *       <p>Estimated gas: {estimate?.gas}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function usePrepareTransfer(params: TransferParams | null) {
  const [data, setData] = useState<{ route: string; gas: number } | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Simulate preparation (in real implementation, call estimateTransferGas)
  useState(() => {
    if (!params) return

    setIsLoading(true)
    // Mock gas estimation
    setTimeout(() => {
      setData({
        route: "cadence-to-evm",
        gas: 500,
      })
      setIsLoading(false)
    }, 100)
  })

  return { data, isLoading, error }
}
