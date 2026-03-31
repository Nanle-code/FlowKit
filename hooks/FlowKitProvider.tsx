import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { init, subscribe } from '../src/client'
import type { FlowKitConfig, FlowKitUser } from '../src/types'

interface FlowKitContextValue {
  user: FlowKitUser | null
  isConnected: boolean
  network: FlowKitConfig['network']
}

const FlowKitContext = createContext<FlowKitContextValue | null>(null)

interface FlowKitProviderProps extends FlowKitConfig {
  children: ReactNode
  appName?: string
}

export function FlowKitProvider({
  children,
  network,
  appName,
  accessNode,
  evmGateway,
  defaultSponsor,
}: FlowKitProviderProps) {
  const [user, setUser] = useState<FlowKitUser | null>(null)

  useEffect(() => {
    init({ network, appName, accessNode, evmGateway, defaultSponsor })
    const unsub = subscribe((u) => setUser(u))
    return () => { if (typeof unsub === 'function') unsub() }
  }, [network, appName])

  return (
    <FlowKitContext.Provider value={{ user, isConnected: !!user, network }}>
      {children}
    </FlowKitContext.Provider>
  )
}

export function useFlowKit(): FlowKitContextValue {
  const ctx = useContext(FlowKitContext)
  if (!ctx) throw new Error('useFlowKit must be used inside <FlowKitProvider>')
  return ctx
}
