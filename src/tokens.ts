import type { TokenConfig, TokenIdentifier } from "./types"

/**
 * tokens.ts — Token registry and configuration
 * 
 * Maintains mappings between token symbols and their Cadence/EVM contracts.
 * Supports FLOW, USDC, USDT, and custom tokens via contract addresses.
 */

// ─── Token Registry ───────────────────────────────────────────────

export const TOKEN_CONFIGS: Record<string, TokenConfig> = {
  FLOW: {
    symbol: "FLOW",
    cadenceContract: "FlowToken",
    cadenceAddress: "0x1654653399040a61", // Mainnet
    evmContract: "0x0000000000000000000000000000000000000000", // Native
    decimals: 8,
    vaultPath: "/storage/flowTokenVault",
    receiverPath: "/public/flowTokenReceiver",
    balancePath: "/public/flowTokenBalance",
  },
  USDC: {
    symbol: "USDC",
    cadenceContract: "FiatToken",
    cadenceAddress: "0xb19436aae4d94622", // Mainnet
    evmContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Mainnet
    decimals: 6,
    vaultPath: "/storage/USDCVault",
    receiverPath: "/public/USDCReceiver",
    balancePath: "/public/USDCBalance",
  },
  USDT: {
    symbol: "USDT",
    cadenceContract: "TeleportedTetherToken",
    cadenceAddress: "0xcfdd90d4a00f7b5b", // Mainnet
    evmContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // Mainnet
    decimals: 6,
    vaultPath: "/storage/teleportedTetherTokenVault",
    receiverPath: "/public/teleportedTetherTokenReceiver",
    balancePath: "/public/teleportedTetherTokenBalance",
  },
}

// Testnet overrides
export const TESTNET_TOKEN_CONFIGS: Record<string, Partial<TokenConfig>> = {
  FLOW: {
    cadenceAddress: "0x7e60df042a9c0868",
  },
  USDC: {
    cadenceAddress: "0xa983fecbed621163",
    evmContract: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Testnet USDC
  },
  USDT: {
    cadenceAddress: "0xab26e0a07d770ec1",
    evmContract: "0x0000000000000000000000000000000000000000", // Not deployed on testnet
  },
}

/**
 * Get token configuration by symbol or contract address
 */
export function getTokenConfig(
  token: TokenIdentifier,
  network: "mainnet" | "testnet" | "emulator" = "mainnet"
): TokenConfig {
  // Check if it's a known symbol
  const upperToken = token.toUpperCase()
  if (TOKEN_CONFIGS[upperToken]) {
    const config = { ...TOKEN_CONFIGS[upperToken] }
    
    // Apply testnet overrides
    if (network === "testnet" && TESTNET_TOKEN_CONFIGS[upperToken]) {
      Object.assign(config, TESTNET_TOKEN_CONFIGS[upperToken])
    }
    
    return config
  }

  // If it's a contract address, create a generic config
  if (token.startsWith("0x")) {
    const isEVM = token.length === 42 // 0x + 40 hex chars
    
    return {
      symbol: "CUSTOM",
      cadenceContract: isEVM ? "Unknown" : token,
      cadenceAddress: isEVM ? "0x0000000000000000" : token,
      evmContract: isEVM ? token : "0x0000000000000000000000000000000000000000",
      decimals: 18, // Default to 18 for ERC-20
      vaultPath: "/storage/customTokenVault",
      receiverPath: "/public/customTokenReceiver",
      balancePath: "/public/customTokenBalance",
    }
  }

  throw new Error(`FlowKit: Unknown token "${token}". Use FLOW, USDC, USDT, or a contract address.`)
}

/**
 * Check if a token is supported
 */
export function isSupportedToken(token: TokenIdentifier): boolean {
  const upperToken = token.toUpperCase()
  return upperToken in TOKEN_CONFIGS || token.startsWith("0x")
}

/**
 * Get all supported token symbols
 */
export function getSupportedTokens(): string[] {
  return Object.keys(TOKEN_CONFIGS)
}

/**
 * Format amount based on token decimals
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount)
  if (isNaN(num)) throw new Error(`Invalid amount: ${amount}`)
  return num.toFixed(decimals)
}

/**
 * Convert amount to smallest unit (e.g., USDC to micro-USDC)
 */
export function toSmallestUnit(amount: string, decimals: number): string {
  const num = parseFloat(amount)
  if (isNaN(num)) throw new Error(`Invalid amount: ${amount}`)
  return (num * Math.pow(10, decimals)).toFixed(0)
}

/**
 * Convert from smallest unit to human-readable
 */
export function fromSmallestUnit(amount: string, decimals: number): string {
  const num = parseFloat(amount)
  if (isNaN(num)) throw new Error(`Invalid amount: ${amount}`)
  return (num / Math.pow(10, decimals)).toFixed(decimals)
}
