// ─── FlowKit SDK Entry Point ──────────────────────────────────────

export { init, connect, disconnect, subscribe, getConfig, getExplorerUrl } from "./client"
export { transfer, estimateTransferGas } from "./transfer"
export { 
  transferNFT, 
  getNFTMetadata, 
  getNFTBalance,
  getNFTCollectionConfig,
  NFT_COLLECTIONS 
} from "./nft"
export { batch, batchCadence } from "./batch"
export { sponsor, needsSponsorship } from "./sponsor"
export { 
  balance, 
  getMultiTokenBalance,
  getCadenceTokenBalance,
  getCOATokenBalance,
  getEVMTokenBalance,
  getCadenceBalance, 
  getCOABalance, 
  getEVMBalance, 
  resolveAddresses 
} from "./balance"
export { detectVM, isCadenceAddress, isEVMAddress, detectTransferRoute } from "./detect"
export { 
  getTokenConfig, 
  isSupportedToken, 
  getSupportedTokens,
  formatTokenAmount,
  toSmallestUnit,
  fromSmallestUnit,
  TOKEN_CONFIGS 
} from "./tokens"

export type {
  Network,
  VM,
  CadenceAddress,
  EVMAddress,
  AnyAddress,
  FlowKitConfig,
  FlowKitUser,
  ConnectOptions,
  TransferParams,
  TransferResult,
  TransferRoute,
  TokenIdentifier,
  TokenConfig,
  NFTCollectionConfig,
  NFTTransferParams,
  NFTTransferResult,
  NFTTransferRoute,
  NFTMetadata,
  NFTBalanceResult,
  BatchCall,
  BatchResult,
  BalanceResult,
  TokenBalance,
  MultiTokenBalanceResult,
} from "./types"
