import * as fcl from "@onflow/fcl"
import type { 
  AnyAddress, 
  BalanceResult, 
  CadenceAddress, 
  TokenIdentifier,
  TokenBalance,
  MultiTokenBalanceResult 
} from "./types"
import { detectVM, isCadenceAddress } from "./detect"
import { getCOAAddress, getConfig } from "./client"
import { getTokenConfig, fromSmallestUnit } from "./tokens"

/**
 * balance.ts — Multi-token balance queries across Cadence and EVM
 * 
 * Supports querying FLOW, USDC, USDT, and custom tokens across both VMs.
 */

// ─── Cadence Balance Scripts ──────────────────────────────────────

function getCadenceBalanceScript(vaultPath: string, balancePath: string): string {
  return `
import FungibleToken from 0xFungibleToken

access(all) fun main(address: Address): UFix64 {
  let account = getAccount(address)
  if let vaultRef = account.capabilities.borrow<&{FungibleToken.Balance}>(${balancePath}) {
    return vaultRef.balance
  }
  return 0.0
}`
}

function getCOABalanceScript(): string {
  return `
import EVM from 0xEVM

access(all) fun main(cadenceAddress: Address): UFix64 {
  if let coa = getAuthAccount<auth(Storage) &Account>(cadenceAddress)
    .storage.borrow<&EVM.CadenceOwnedAccount>(from: /storage/evm) {
    return coa.balance().inFLOW()
  }
  return 0.0
}`
}

function getEVMBalanceScript(): string {
  return `
import EVM from 0xEVM

access(all) fun main(evmAddress: String): UFix64 {
  let addr = EVM.addressFromString(evmAddress)
  let balance = addr.balance()
  return balance.inFLOW()
}`
}

// ─── ERC-20 Balance Query ─────────────────────────────────────────

function getERC20BalanceScript(tokenAddress: string): string {
  return `
import EVM from 0xEVM

access(all) fun main(evmAddress: String): UInt256 {
  let addr = EVM.addressFromString(evmAddress)
  let tokenAddr = EVM.addressFromString("${tokenAddress}")
  
  // ERC-20 balanceOf(address) = 0x70a08231
  let selector = "70a08231"
  let addressPadded = evmAddress.slice(from: 2).padStart(64, "0")
  let calldata = selector.concat(addressPadded).decodeHex()
  
  let result = tokenAddr.call(
    data: calldata,
    gasLimit: 100000,
    value: EVM.Balance(attoflow: 0)
  )
  
  if result.status == EVM.Status.successful {
    // Decode uint256 from result
    return UInt256.fromBigEndianBytes(result.data) ?? 0
  }
  
  return 0
}`
}

// ─── Single Token Balance ─────────────────────────────────────────

/**
 * Get balance for a specific token across both VMs.
 *
 * @example
 * const bal = await balance('0x1d007d755531709b', 'USDC')
 * console.log(bal.total) // "150.500000"
 */
export async function balance(
  address: AnyAddress,
  token: TokenIdentifier = "FLOW"
): Promise<BalanceResult> {
  const config = getConfig()
  const tokenConfig = getTokenConfig(token, config.network)
  const vm = detectVM(address)

  if (vm === "evm") {
    // Pure EVM address
    const evmBal = await getEVMTokenBalance(address, tokenConfig.evmContract, tokenConfig.decimals)
    return {
      cadence: "0." + "0".repeat(tokenConfig.decimals),
      evm: evmBal,
      total: evmBal,
      tokens: {},
    }
  }

  if (vm === "cadence") {
    // Cadence address - query both Cadence vault and COA
    const [cadenceBal, coaBal] = await Promise.all([
      getCadenceTokenBalance(address as CadenceAddress, tokenConfig),
      getCOATokenBalance(address as CadenceAddress, tokenConfig),
    ])

    const total = (parseFloat(cadenceBal) + parseFloat(coaBal)).toFixed(tokenConfig.decimals)

    return {
      cadence: cadenceBal,
      evm: coaBal,
      total,
      tokens: {},
    }
  }

  throw new Error(`FlowKit: Cannot detect VM for address: ${address}`)
}

/**
 * Get balances for multiple tokens at once.
 *
 * @example
 * const balances = await getMultiTokenBalance('0x...', ['FLOW', 'USDC', 'USDT'])
 * console.log(balances.USDC.total) // "150.500000"
 */
export async function getMultiTokenBalance(
  address: AnyAddress,
  tokens: TokenIdentifier[] = ["FLOW", "USDC", "USDT"]
): Promise<MultiTokenBalanceResult> {
  const results: MultiTokenBalanceResult = {}

  await Promise.all(
    tokens.map(async (token) => {
      try {
        const config = getConfig()
        const tokenConfig = getTokenConfig(token, config.network)
        const bal = await balance(address, token)

        results[token] = {
          cadence: bal.cadence,
          evm: bal.evm,
          total: bal.total,
          symbol: tokenConfig.symbol,
          decimals: tokenConfig.decimals,
        }
      } catch (error) {
        // Skip tokens that fail to query
        console.warn(`FlowKit: Failed to query balance for ${token}:`, error)
      }
    })
  )

  return results
}

// ─── Individual Balance Queries ───────────────────────────────────

/**
 * Get Cadence vault balance for a specific token
 */
export async function getCadenceTokenBalance(
  address: CadenceAddress,
  tokenConfig: ReturnType<typeof getTokenConfig>
): Promise<string> {
  try {
    const result = await fcl.query({
      cadence: getCadenceBalanceScript(tokenConfig.vaultPath, tokenConfig.balancePath),
      args: (arg: any, t: any) => [arg(address, t.Address)],
    })
    return String(result ?? "0." + "0".repeat(tokenConfig.decimals))
  } catch {
    return "0." + "0".repeat(tokenConfig.decimals)
  }
}

/**
 * Get COA balance for a specific token (EVM side of Cadence account)
 */
export async function getCOATokenBalance(
  address: CadenceAddress,
  tokenConfig: ReturnType<typeof getTokenConfig>
): Promise<string> {
  try {
    // First get the COA address
    const coaAddress = await getCOAAddress(address)
    if (!coaAddress) return "0." + "0".repeat(tokenConfig.decimals)

    // For FLOW, use native balance query
    if (tokenConfig.symbol === "FLOW") {
      const result = await fcl.query({
        cadence: getCOABalanceScript(),
        args: (arg: any, t: any) => [arg(address, t.Address)],
      })
      return String(result ?? "0.00000000")
    }

    // For ERC-20 tokens, query via contract
    return await getEVMTokenBalance(coaAddress, tokenConfig.evmContract, tokenConfig.decimals)
  } catch {
    return "0." + "0".repeat(tokenConfig.decimals)
  }
}

/**
 * Get EVM token balance (native FLOW or ERC-20)
 */
export async function getEVMTokenBalance(
  evmAddress: string,
  tokenContract: string,
  decimals: number
): Promise<string> {
  try {
    // Native FLOW balance
    if (tokenContract === "0x0000000000000000000000000000000000000000") {
      const result = await fcl.query({
        cadence: getEVMBalanceScript(),
        args: (arg: any, t: any) => [arg(evmAddress, t.String)],
      })
      return String(result ?? "0.00000000")
    }

    // ERC-20 balance
    const result = await fcl.query({
      cadence: getERC20BalanceScript(tokenContract),
      args: (arg: any, t: any) => [arg(evmAddress, t.String)],
    })

    // Convert from smallest unit to human-readable
    const balanceStr = String(result ?? "0")
    return fromSmallestUnit(balanceStr, decimals)
  } catch (error) {
    console.warn(`FlowKit: Failed to query EVM balance for ${tokenContract}:`, error)
    return "0." + "0".repeat(decimals)
  }
}

/**
 * Legacy function - get FLOW balance only
 * @deprecated Use balance(address, 'FLOW') instead
 */
export async function getCadenceBalance(address: CadenceAddress): Promise<string> {
  const config = getConfig()
  const tokenConfig = getTokenConfig("FLOW", config.network)
  return getCadenceTokenBalance(address, tokenConfig)
}

/**
 * Legacy function - get COA FLOW balance only
 * @deprecated Use balance(address, 'FLOW') instead
 */
export async function getCOABalance(address: CadenceAddress): Promise<string> {
  const config = getConfig()
  const tokenConfig = getTokenConfig("FLOW", config.network)
  return getCOATokenBalance(address, tokenConfig)
}

/**
 * Legacy function - get EVM FLOW balance only
 * @deprecated Use getEVMTokenBalance instead
 */
export async function getEVMBalance(evmAddress: string): Promise<string> {
  return getEVMTokenBalance(evmAddress, "0x0000000000000000000000000000000000000000", 8)
}

/**
 * Resolve any address to its canonical {cadence, evm} pair
 */
export async function resolveAddresses(
  address: AnyAddress
): Promise<{ cadence: CadenceAddress | null; evm: string | null }> {
  if (isCadenceAddress(address)) {
    const evm = await getCOAAddress(address as CadenceAddress)
    return { cadence: address as CadenceAddress, evm }
  }
  return { cadence: null, evm: address }
}
