/**
 * useFlowConnect - Connect to Flow wallet with automatic COA creation
 * 
 * Wagmi-style hook for Flow authentication. Handles FCL wallet discovery,
 * COA creation, and auth state management.
 */

import { useState, useCallback } from "react"
import { connect as sdkConnect, disconnect as sdkDisconnect } from "../src/index"
import { useFlowKitContext } from "./FlowKitProvider"
import type { UseFlowConnectConfig, UseFlowConnectReturn } from "./types"
import type { FlowKitUser } from "../src/types"

/**
 * Connect to Flow wallet with automatic COA creation
 * 
 * @example
 * ```tsx
 * function ConnectButton() {
 *   const { connect, disconnect, user, isConnected, isLoading } = useFlowConnect({
 *     onSuccess: (user) => console.log('Connected:', user.cadenceAddress),
 *     onError: (error) => console.error('Connection failed:', error)
 *   })
 * 
 *   if (isConnected) {
 *     return (
 *       <div>
 *         <p>Cadence: {user?.cadenceAddress}</p>
 *         <p>EVM: {user?.evmAddress}</p>
 *         <button onClick={disconnect}>Disconnect</button>
 *       </div>
 *     )
 *   }
 * 
 *   return (
 *     <button onClick={() => connect()} disabled={isLoading}>
 *       {isLoading ? 'Connecting...' : 'Connect Wallet'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useFlowConnect(config: UseFlowConnectConfig = {}): UseFlowConnectReturn {
  const { user, isConnected, connect: contextConnect, disconnect: contextDisconnect } = useFlowKitContext()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<FlowKitUser | undefined>(undefined)

  const mutate = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const connectedUser = await contextConnect(config)
      setData(connectedUser)
      config.onSuccess?.(connectedUser)
      return connectedUser
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      config.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [contextConnect, config])

  const disconnect = useCallback(async () => {
    setIsLoading(true)
    try {
      await contextDisconnect()
      setData(undefined)
      setError(null)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [contextDisconnect])

  const reset = useCallback(() => {
    setData(undefined)
    setError(null)
  }, [])

  return {
    user,
    isConnected,
    data,
    error,
    isLoading,
    isSuccess: !!data && !error,
    isError: !!error,
    mutate,
    mutateAsync: mutate,
    disconnect,
    reset,
  }
}

/**
 * Hook to get current Flow user without connect functionality
 * 
 * @example
 * ```tsx
 * function UserProfile() {
 *   const user = useFlowUser()
 *   
 *   if (!user) return <p>Not connected</p>
 *   
 *   return (
 *     <div>
 *       <p>Cadence: {user.cadenceAddress}</p>
 *       <p>EVM: {user.evmAddress}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFlowUser() {
  const { user } = useFlowKitContext()
  return user
}

/**
 * Hook to check if user is connected
 * 
 * @example
 * ```tsx
 * function ProtectedRoute() {
 *   const isConnected = useIsConnected()
 *   
 *   if (!isConnected) {
 *     return <Navigate to="/connect" />
 *   }
 *   
 *   return <Dashboard />
 * }
 * ```
 */
export function useIsConnected(): boolean {
  const { isConnected } = useFlowKitContext()
  return isConnected
}
