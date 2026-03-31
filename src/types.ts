// ─── Core Types ───────────────────────────────────────────────────

export type Network = "mainnet" | "testnet" | "emulator"
export type VM = "cadence" | "evm" | "unknown"

export type CadenceAddress = string // 0x + 1-16 hex chars
export type EVMAddress = string     // 0x + 40 hex chars
export type AnyAddress = CadenceAddress | EVMAddress

// ─── Config ───────────────────────────────────────────────────────

export interface FlowKitConfig {
  network: Network
  accessNode?: string
  appName?: string
}

// ─── User ─────────────────────────────────────────────────────────

export interface FlowKitUser {
  cadenceAddress: CadenceAddress
  evmAddress: EVMAddress | null
  loggedIn: boolean
}

export interface ConnectOptions {
  withEVM?: boolean
}

// ─── Transfer ─────────────────────────────────────────────────────

export type TokenIdentifier = "FLOW" | "USDC" | "USDT" | string // string = contract address

export interface TransferParams {
  token: TokenIdentifier
  amount: string
  to: AnyAddress
  from?: AnyAddress
}

export interface TransferResult {
  txHash: string
  vm: "cadence" | "evm" | "cross-vm"
  explorerUrl: string
  token: TokenIdentifier
  route: TransferRoute
}

export type TransferRoute = 
  | "cadence-to-cadence"
  | "cadence-to-evm"
  | "evm-to-cadence"
  | "evm-to-evm"

export interface TokenConfig {
  symbol: string
  cadenceContract: string
  cadenceAddress: string
  evmContract: string
  decimals: number
  vaultPath: string
  receiverPath: string
  balancePath: string
}

// ─── Batch ────────────────────────────────────────────────────────

export interface BatchCall {
  contractAddress: EVMAddress
  calldata?: string
  value?: string
}

export interface BatchResult {
  txHash: string
  results: Array<{ success: boolean }>
}

// ─── Balance ──────────────────────────────────────────────────────

export interface BalanceResult {
  cadence: string
  evm: string
  total: string
  tokens: Record<string, TokenBalance>
}

export interface TokenBalance {
  cadence: string
  evm: string
  total: string
  symbol: string
  decimals: number
}

export interface MultiTokenBalanceResult {
  [token: string]: TokenBalance
}

// ─── NFT ──────────────────────────────────────────────────────────

export interface NFTCollectionConfig {
  name: string
  cadenceContract: string
  cadenceAddress: string
  evmContract: string
  collectionPath: string
  collectionPublicPath: string
  metadataViews: boolean
}

export interface NFTTransferParams {
  collection: string // Collection name or ERC-721 contract address
  tokenId: string
  to: AnyAddress
  from?: AnyAddress
}

export interface NFTTransferResult {
  txHash: string
  vm: "cadence" | "evm" | "cross-vm"
  explorerUrl: string
  collection: string
  tokenId: string
  route: NFTTransferRoute
}

export type NFTTransferRoute = 
  | "cadence-to-cadence"
  | "cadence-to-evm"
  | "evm-to-cadence"
  | "evm-to-evm"

export interface NFTMetadata {
  tokenId: string
  name: string
  description: string
  image: string
  collection: string
  vm: "cadence" | "evm"
  attributes?: Array<{ trait_type: string; value: any }>
}

export interface NFTBalanceResult {
  collection: string
  tokenIds: string[]
  count: number
  vm: "cadence" | "evm"
}
