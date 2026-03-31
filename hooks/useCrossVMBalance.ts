/**
 * useCrossVMBalance - Query token balances across Cadence and EVM
 * 
 * Wagmi-style hook for querying FLOW, USDC, USDT, or custom token balances
 * across both VMs with automatic aggregation.
 */

import { useState, useEffect, useCallback } from "react"
import { balance as sdkBalance, getMultiTokenBalance } from "../src/index"
import type { BalanceResult, TokenIdentifier, MultiTokenBalanceResult } from "../src/types"
import type { UseCrossVMBalanceConfig, UseCrossVMBalanceReturn } from "./types"
import { useFlowKitContext } from "./FlowKitProvider"

/**
 * Query token balance across Cadence and EVM
 * 
 * @example
 * ```tsx
 * function BalanceDisplay() {
 *   const { balance, isLoading, error, refetch } = useCrossVMBalance({
 *     address: '0x1d007d755531709b',
 *     token: 'USDC'
 *   })
 * 
 *   if (isLoading) return <p>Loading...</p>
 *   if (error) return <p>Error: {error.message}</p>
 * 
 *   return (
 *     <div>
 *       <p>Cadence: {balance?.cadence} USDC</p>
 *       <p>EVM: {balance?.evm} USDC</p>
 *       <p>Total: {balance?.total} USDC</p>
 *       <button onClick={refetch}>Refresh</button>
 *     </div>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Auto-refresh every 10 seconds
 * const { balance } = useCrossVMBalance({
 *   address: userAddress,
 *   token: 'FLOW',
 *   refetchInterval: 10000
 * })
 * ```
 */
export function useCrossVMBalance(
  address: string | undefined,
  token: TokenIdentifier = "FLOW",
  config: UseCrossVMBalanceConfig = {}
): UseCrossVMBalanceReturn {
  const [data, setData] = useState<BalanceResult | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { isInitialized } = useFlowKitContext()

  const fetchBalance = useCallback(async () => {
    if (!address || !isInitialized || config.enabled === false) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await sdkBalance(address, token)
      setData(result)
      config.onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      config.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [address, token, isInitialized, config])

  // Initial fetch
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Auto-refetch interval
  useEffect(() => {
    if (!config.refetchInterval) return

    const interval = setInterval(fetchBalance, config.refetchInterval)
    return () => clearInterval(interval)
  }, [config.refetchInterval, fetchBalance])

  return {
    data,
    balance: data,
    error,
    isLoading,
    isSuccess: !!data && !error,
    isError: !!error,
    refetch: fetchBalance,
  }
}

/**
 * Query multiple token balances at once
 * 
 * @example
 * ```tsx
 * function MultiTokenBalance() {
 *   const { balances, isLoading } = useMultiTokenBalance({
 *     address: userAddress,
 *     tokens: ['FLOW', 'USDC', 'USDT']
 *   })
 * 
 *   if (isLoading) return <p>Loading...</p>
 * 
 *   return (
 *     <div>
 *       {Object.entries(balances || {}).map(([token, balance]) => (
 *         <div key={token}>
 *           <strong>{token}:</strong> {balance.total}
 *         </div>
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 */
export function useMultiTokenBalance(
  address: string | undefined,
  tokens: TokenIdentifier[] = ["FLOW", "USDC", "USDT"],
  config: UseCrossVMBalanceConfig = {}
) {
  const [data, setData] = useState<MultiTokenBalanceResult | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { isInitialized } = useFlowKitContext()

  const fetchBalances = useCallback(async () => {
    if (!address || !isInitialized || config.enabled === false) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getMultiTokenBalance(address, tokens)
      setData(result)
      config.onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      config.onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [address, tokens, isInitialized, config])

  useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  useEffect(() => {
    if (!config.refetchInterval) return

    const interval = setInterval(fetchBalances, config.refetchInterval)
    return () => clearInterval(interval)
  }, [config.refetchInterval, fetchBalances])

  return {
    data,
    balances: data,
    error,
    isLoading,
    isSuccess: !!data && !error,
    isError: !!error,
    refetch: fetchBalances,
  }
}

/**
 * Hook to watch balance changes in real-time
 * 
 * @example
 * ```tsx
 * function LiveBalance() {
 *   const balance = useWatchBalance({
 *     address: userAddress,
 *     token: 'FLOW',
 *     pollInterval: 5000  // Check every 5 seconds
 *   })
 * 
 *   return <p>Balance: {balance?.total} FLOW</p>
 * }
 * ```
 */
export function useWatchBalance(
  address: string | undefined,
  token: TokenIdentifier = "FLOW",
  pollInterval: number = 10000
) {
  return useCrossVMBalance(address, token, {
    refetchInterval: pollInterval,
    enabled: !!address,
  })
}
