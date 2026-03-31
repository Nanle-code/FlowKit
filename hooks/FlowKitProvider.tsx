/**
 * FlowKitProvider - Context provider for FlowKit React hooks
 * 
 * Wraps your app to provide FlowKit functionality to all hooks.
 * Integrates with wagmi/RainbowKit for hybrid Cadence + EVM setups.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { init, connect as sdkConnect, disconnect as sdkDisconnect, subscribe } from "../src/index"
import type { FlowKitUser } from "../src/types"
import type { FlowKitContextValue, FlowKitProviderProps } from "./types"

const FlowKitContext = createContext<FlowKitContextValue | null>(null)

/**
 * FlowKit Provider Component
 * 
 * @example
 * ```tsx
 * import { FlowKitProvider } from 'flowkit/hooks'
 * 
 * function App() {
 *   return (
 *     <FlowKitProvider network="testnet" appName="My dApp">
 *       <YourApp />
 *     </FlowKitProvider>
 *   )
 * }
 * ```
 */
export function FlowKitProvider({
  children,
  network = "testnet",
  appName = "FlowKit App",
  config = {},
}: FlowKitProviderProps) {
  const [user, setUser] = useState<FlowKitUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize FlowKit SDK
  useEffect(() => {
    init({
      network,
      appName,
      ...config,
    })
    setIsInitialized(true)
  }, [network, appName, config])

  // Subscribe to auth state changes
  useEffect(() => {
    if (!isInitialized) return

    const unsubscribe = subscribe((currentUser) => {
      setUser(currentUser)
    })

    return () => {
      unsubscribe()
    }
  }, [isInitialized])

  const connect = useCallback(async () => {
    const connectedUser = await sdkConnect({ withEVM: true })
    setUser(connectedUser)
    return connectedUser
  }, [])

  const disconnect = useCallback(async () => {
    await sdkDisconnect()
    setUser(null)
  }, [])

  const value: FlowKitContextValue = {
    user,
    isConnected: user?.loggedIn ?? false,
    isInitialized,
    network,
    connect,
    disconnect,
  }

  return <FlowKitContext.Provider value={value}>{children}</FlowKitContext.Provider>
}

/**
 * Hook to access FlowKit context
 * 
 * @throws Error if used outside FlowKitProvider
 */
export function useFlowKitContext(): FlowKitContextValue {
  const context = useContext(FlowKitContext)
  if (!context) {
    throw new Error("useFlowKitContext must be used within FlowKitProvider")
  }
  return context
}

/**
 * Hook to check if FlowKit is initialized
 */
export function useFlowKitInitialized(): boolean {
  const context = useContext(FlowKitContext)
  return context?.isInitialized ?? false
}
