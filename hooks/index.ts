/**
 * FlowKit React Hooks
 * 
 * Wagmi-style hooks for Flow blockchain with automatic Cadence ↔ EVM routing.
 * 
 * @example
 * ```tsx
 * import { FlowKitProvider, useFlowConnect, useFlowTransfer } from 'flowkit/hooks'
 * 
 * function App() {
 *   return (
 *     <FlowKitProvider network="testnet" appName="My dApp">
 *       <MyApp />
 *     </FlowKitProvider>
 *   )
 * }
 * 
 * function MyApp() {
 *   const { connect, user, isConnected } = useFlowConnect()
 *   const { transfer, isLoading } = useFlowTransfer()
 * 
 *   return (
 *     <div>
 *       {!isConnected ? (
 *         <button onClick={() => connect()}>Connect</button>
 *       ) : (
 *         <button onClick={() => transfer({ 
 *           token: 'USDC', 
 *           amount: '100', 
 *           to: '0x...' 
 *         })}>
 *           Transfer USDC
 *         </button>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */

// Provider
export { FlowKitProvider, useFlowKitContext, useFlowKitInitialized } from "./FlowKitProvider"

// Connection hooks
export { useFlowConnect, useFlowUser, useIsConnected } from "./useFlowConnect"

// Transfer hooks
export { useFlowTransfer, usePrepareTransfer } from "./useFlowTransfer"

// Balance hooks
export {
  useCrossVMBalance,
  useMultiTokenBalance,
  useWatchBalance,
} from "./useCrossVMBalance"

// Batch hooks
export {
  useAtomicBatch,
  usePrepareBatch,
  useDeFiBatch,
} from "./useAtomicBatch"

// Sponsor hooks
export {
  useGasSponsor,
  useNeedsSponsorship,
  useSponsoredOnboarding,
} from "./useGasSponsor"

// NFT hooks
export {
  useNFTTransfer,
  useNFTMetadata,
  useNFTBalance,
  useNFTCollection,
} from "./useNFT"

// Types
export type {
  UseFlowKitState,
  UseMutationState,
  UseFlowConnectConfig,
  UseFlowTransferConfig,
  UseCrossVMBalanceConfig,
  UseAtomicBatchConfig,
  UseGasSponsorConfig,
  UseFlowConnectReturn,
  UseFlowTransferReturn,
  UseCrossVMBalanceReturn,
  UseAtomicBatchReturn,
  UseGasSponsorReturn,
  FlowKitContextValue,
  FlowKitProviderProps,
} from "./types"
