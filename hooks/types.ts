/**
 * Type definitions for FlowKit React hooks
 */

import type {
  TransferParams,
  TransferResult,
  BalanceResult,
  TokenIdentifier,
  FlowKitUser,
  BatchCall,
  BatchResult,
  MultiTokenBalanceResult,
} from "../src/types"

// ─── Hook State Types ─────────────────────────────────────────────

export interface UseFlowKitState<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
}

export interface UseMutationState<TData, TVariables> {
  data: TData | undefined
  error: Error | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  mutate: (variables: TVariables) => Promise<TData>
  mutateAsync: (variables: TVariables) => Promise<TData>
  reset: () => void
}

// ─── Hook Configuration Types ─────────────────────────────────────

export interface UseFlowConnectConfig {
  withEVM?: boolean
  onSuccess?: (user: FlowKitUser) => void
  onError?: (error: Error) => void
}

export interface UseFlowTransferConfig {
  onSuccess?: (result: TransferResult) => void
  onError?: (error: Error) => void
  onSettled?: (result: TransferResult | undefined, error: Error | null) => void
}

export interface UseCrossVMBalanceConfig {
  tokens?: TokenIdentifier[]
  enabled?: boolean
  refetchInterval?: number
  onSuccess?: (data: BalanceResult | MultiTokenBalanceResult) => void
  onError?: (error: Error) => void
}

export interface UseAtomicBatchConfig {
  onSuccess?: (result: BatchResult) => void
  onError?: (error: Error) => void
  onSettled?: (result: BatchResult | undefined, error: Error | null) => void
}

export interface UseGasSponsorConfig {
  sponsor: string
  onSuccess?: (result: { txHash: string; feeSponsored: boolean }) => void
  onError?: (error: Error) => void
}

// ─── Hook Return Types ────────────────────────────────────────────

export interface UseFlowConnectReturn extends UseMutationState<FlowKitUser, void> {
  user: FlowKitUser | null
  isConnected: boolean
  disconnect: () => Promise<void>
}

export interface UseFlowTransferReturn extends UseMutationState<TransferResult, TransferParams> {
  transfer: (params: TransferParams) => Promise<TransferResult>
  transferAsync: (params: TransferParams) => Promise<TransferResult>
}

export interface UseCrossVMBalanceReturn extends UseFlowKitState<BalanceResult | MultiTokenBalanceResult> {
  refetch: () => Promise<void>
  balance: BalanceResult | MultiTokenBalanceResult | undefined
}

export interface UseAtomicBatchReturn extends UseMutationState<BatchResult, BatchCall[]> {
  batch: (calls: BatchCall[], gasLimit?: number) => Promise<BatchResult>
  batchAsync: (calls: BatchCall[], gasLimit?: number) => Promise<BatchResult>
}

export interface UseGasSponsorReturn {
  sponsor: (cadence: string, args?: any) => Promise<{ txHash: string; feeSponsored: boolean }>
  isLoading: boolean
  error: Error | null
}

// ─── Context Types ────────────────────────────────────────────────

export interface FlowKitContextValue {
  user: FlowKitUser | null
  isConnected: boolean
  isInitialized: boolean
  network: "mainnet" | "testnet" | "emulator"
  connect: (config?: UseFlowConnectConfig) => Promise<FlowKitUser>
  disconnect: () => Promise<void>
}

export interface FlowKitProviderProps {
  children: React.ReactNode
  network?: "mainnet" | "testnet" | "emulator"
  appName?: string
  config?: {
    accessNode?: string
  }
}
