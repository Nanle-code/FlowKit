import * as fcl from "@onflow/fcl"
import { detectVM, detectTransferRoute } from "./detect"
import { getExplorerUrl, getConfig } from "./client"
import { getTokenConfig, formatTokenAmount } from "./tokens"
import type { TransferParams, TransferResult, TokenConfig } from "./types"

/**
 * transfer.ts — Multi-token cross-VM transfer with automatic routing
 * 
 * Supports FLOW, USDC, USDT, and custom tokens across Cadence and EVM.
 * Automatically detects VM and routes transactions appropriately.
 */

// ─── Cadence: Generic FungibleToken transfer ──────────────────────

function getCadenceTransferTx(tokenConfig: TokenConfig): string {
  return `
import FungibleToken from 0xFungibleToken
import ${tokenConfig.cadenceContract} from ${tokenConfig.cadenceAddress}

transaction(amount: UFix64, recipient: Address) {
  let sentVault: @{FungibleToken.Vault}

  prepare(signer: auth(BorrowValue) &Account) {
    let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &${tokenConfig.cadenceContract}.Vault>(
      from: ${tokenConfig.vaultPath}
    ) ?? panic("Could not borrow ${tokenConfig.symbol} vault")
    
    self.sentVault <- vaultRef.withdraw(amount: amount)
  }

  execute {
    let recipient = getAccount(recipient)
    let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
      ${tokenConfig.receiverPath}
    ) ?? panic("Could not borrow ${tokenConfig.symbol} receiver")
    
    receiverRef.deposit(from: <-self.sentVault)
  }
}`
}

// ─── Cross-VM: Cadence → EVM transfer ─────────────────────────────

function getCadenceToEVMTx(tokenConfig: TokenConfig): string {
  if (tokenConfig.symbol === "FLOW") {
    // FLOW uses native COA transfer
    return `
import EVM from 0xEVM
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

transaction(amount: UFix64, evmRecipient: String) {
  let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount
  let sentVault: @FlowToken.Vault

  prepare(signer: auth(BorrowValue, Storage) &Account) {
    self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found. Call connect() with withEVM: true first.")
    
    let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(
      from: /storage/flowTokenVault
    ) ?? panic("Could not borrow vault")
    
    self.sentVault <- vaultRef.withdraw(amount: amount) as! @FlowToken.Vault
  }

  execute {
    self.coa.deposit(from: <-self.sentVault)
    let addr = EVM.addressFromString(evmRecipient)
    let balance = EVM.Balance(attoflow: 0)
    balance.setFLOW(flow: amount)
    self.coa.transfer(to: addr, balance: balance)
  }
}`
  }

  // For ERC-20 tokens, use the Cross-VM Bridge
  return `
import EVM from 0xEVM
import FungibleToken from 0xFungibleToken
import ${tokenConfig.cadenceContract} from ${tokenConfig.cadenceAddress}
import FlowEVMBridge from 0xFlowEVMBridge

transaction(amount: UFix64, evmRecipient: String) {
  let sentVault: @{FungibleToken.Vault}
  let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount

  prepare(signer: auth(BorrowValue, Storage) &Account) {
    // Borrow COA
    self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found")
    
    // Withdraw from Cadence vault
    let vaultRef = signer.storage.borrow<auth(FungibleToken.Withdraw) &${tokenConfig.cadenceContract}.Vault>(
      from: ${tokenConfig.vaultPath}
    ) ?? panic("Could not borrow ${tokenConfig.symbol} vault")
    
    self.sentVault <- vaultRef.withdraw(amount: amount)
  }

  execute {
    // Bridge tokens to EVM via FlowEVMBridge
    let bridgedTokens <- FlowEVMBridge.bridgeTokensToEVM(
      vault: <-self.sentVault,
      to: self.coa
    )
    
    // Transfer ERC-20 from COA to recipient
    let evmAddr = EVM.addressFromString(evmRecipient)
    let tokenAddr = EVM.addressFromString("${tokenConfig.evmContract}")
    
    // ERC-20 transfer calldata: transfer(address,uint256)
    let transferSelector = "a9059cbb" // transfer(address,uint256)
    let recipientPadded = evmRecipient.slice(from: 2).padStart(64, "0")
    let amountHex = UInt256(amount * UFix64(1000000)).toString(radix: 16).padStart(64, "0")
    let calldata = transferSelector.concat(recipientPadded).concat(amountHex).decodeHex()
    
    let result = self.coa.call(
      to: tokenAddr,
      data: calldata,
      gasLimit: 100000,
      value: EVM.Balance(attoflow: 0)
    )
    
    assert(result.status == EVM.Status.successful, message: "ERC-20 transfer failed")
  }
}`
}

// ─── Cross-VM: EVM → Cadence transfer ─────────────────────────────

function getEVMToCadenceTx(tokenConfig: TokenConfig): string {
  if (tokenConfig.symbol === "FLOW") {
    return `
import EVM from 0xEVM
import FungibleToken from 0xFungibleToken

transaction(amount: UFix64, cadenceRecipient: Address) {
  let coa: auth(EVM.Withdraw) &EVM.CadenceOwnedAccount

  prepare(signer: auth(BorrowValue) &Account) {
    self.coa = signer.storage.borrow<auth(EVM.Withdraw) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found")
  }

  execute {
    let balance = EVM.Balance(attoflow: 0)
    balance.setFLOW(flow: amount)
    let vault <- self.coa.withdraw(balance: balance)
    
    let recipient = getAccount(cadenceRecipient)
    let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)
      ?? panic("No receiver capability on recipient")
    
    receiverRef.deposit(from: <-vault)
  }
}`
  }

  // For ERC-20 tokens, use the Cross-VM Bridge
  return `
import EVM from 0xEVM
import FungibleToken from 0xFungibleToken
import ${tokenConfig.cadenceContract} from ${tokenConfig.cadenceAddress}
import FlowEVMBridge from 0xFlowEVMBridge

transaction(amount: UFix64, cadenceRecipient: Address) {
  let coa: auth(EVM.Call, EVM.Withdraw) &EVM.CadenceOwnedAccount

  prepare(signer: auth(BorrowValue) &Account) {
    self.coa = signer.storage.borrow<auth(EVM.Call, EVM.Withdraw) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found")
  }

  execute {
    // Transfer ERC-20 from COA to bridge
    let tokenAddr = EVM.addressFromString("${tokenConfig.evmContract}")
    let bridgeAddr = FlowEVMBridge.getBridgeAddress()
    
    // ERC-20 transfer calldata
    let transferSelector = "a9059cbb"
    let bridgeAddrPadded = bridgeAddr.toString().slice(from: 2).padStart(64, "0")
    let amountHex = UInt256(amount * UFix64(1000000)).toString(radix: 16).padStart(64, "0")
    let calldata = transferSelector.concat(bridgeAddrPadded).concat(amountHex).decodeHex()
    
    let result = self.coa.call(
      to: tokenAddr,
      data: calldata,
      gasLimit: 100000,
      value: EVM.Balance(attoflow: 0)
    )
    
    assert(result.status == EVM.Status.successful, message: "ERC-20 transfer to bridge failed")
    
    // Bridge tokens from EVM to Cadence
    let vault <- FlowEVMBridge.bridgeTokensFromEVM(
      token: tokenAddr,
      amount: amount,
      from: self.coa
    )
    
    // Deposit to recipient
    let recipient = getAccount(cadenceRecipient)
    let receiverRef = recipient.capabilities.borrow<&{FungibleToken.Receiver}>(
      ${tokenConfig.receiverPath}
    ) ?? panic("No receiver capability on recipient")
    
    receiverRef.deposit(from: <-vault)
  }
}`
}

// ─── EVM: Native ERC-20 transfer ──────────────────────────────────

async function transferERC20(
  tokenAddress: string,
  to: string,
  amount: string,
  decimals: number
): Promise<string> {
  const provider = (window as any).ethereum
  if (!provider) throw new Error("No EVM provider found")

  const accounts = await provider.request({ method: "eth_accounts", params: [] })
  const from = accounts[0]

  // Convert amount to smallest unit
  const amountWei = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals)))
  
  // ERC-20 transfer(address,uint256) = 0xa9059cbb
  const transferSelector = "a9059cbb"
  const recipientPadded = to.slice(2).padStart(64, "0")
  const amountHex = amountWei.toString(16).padStart(64, "0")
  const data = `0x${transferSelector}${recipientPadded}${amountHex}`

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from,
      to: tokenAddress,
      data,
      gas: "0x186a0", // 100000
    }],
  })

  return txHash
}

async function transferEVMNative(to: string, amount: string): Promise<string> {
  const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18)).toString(16)
  const provider = (window as any).ethereum
  if (!provider) throw new Error("No EVM provider found")
  
  const accounts = await provider.request({ method: "eth_accounts", params: [] })
  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: accounts[0], to, value: `0x${amountWei}`, gas: "0x5208" }],
  })
  return txHash
}

// ─── Main transfer function ───────────────────────────────────────

/**
 * Transfer any fungible token between Flow addresses.
 * Automatically detects VM and routes to the correct transaction.
 *
 * @example
 * // FLOW transfer
 * await transfer({ token: 'FLOW', amount: '1.0', to: '0x...' })
 *
 * // USDC transfer (Cadence → EVM)
 * await transfer({ token: 'USDC', amount: '100', to: '0xAbCd...' })
 *
 * // Custom ERC-20 (EVM → EVM)
 * await transfer({ 
 *   token: '0x1234...', 
 *   amount: '50', 
 *   from: '0xAbCd...', 
 *   to: '0xDeF0...' 
 * })
 */
export async function transfer(params: TransferParams): Promise<TransferResult> {
  const { token, amount, to, from } = params

  // Get token configuration
  const config = getConfig()
  const tokenConfig = getTokenConfig(token, config.network)

  // Detect VMs and route
  const toVM = detectVM(to)
  const fromVM = from ? detectVM(from) : "cadence"
  const route = detectTransferRoute(from ?? "0x0000000000000000", to)

  // Format amount based on token decimals
  const formattedAmount = formatTokenAmount(amount, tokenConfig.decimals)

  let txHash: string
  let transferRoute: TransferResult["route"]

  try {
    if (route === "cadence") {
      // Cadence → Cadence
      transferRoute = "cadence-to-cadence"
      txHash = await fcl.mutate({
        cadence: getCadenceTransferTx(tokenConfig),
        args: (arg: any, t: any) => [
          arg(formattedAmount, t.UFix64),
          arg(to, t.Address),
        ],
        limit: 999,
      })
    } else if (route === "evm") {
      // EVM → EVM
      transferRoute = "evm-to-evm"
      if (tokenConfig.symbol === "FLOW") {
        txHash = await transferEVMNative(to, amount)
      } else {
        txHash = await transferERC20(
          tokenConfig.evmContract,
          to,
          amount,
          tokenConfig.decimals
        )
      }
    } else if (fromVM === "cadence" && toVM === "evm") {
      // Cadence → EVM (cross-VM bridge)
      transferRoute = "cadence-to-evm"
      txHash = await fcl.mutate({
        cadence: getCadenceToEVMTx(tokenConfig),
        args: (arg: any, t: any) => [
          arg(formattedAmount, t.UFix64),
          arg(to, t.String),
        ],
        limit: 9999,
      })
    } else if (fromVM === "evm" && toVM === "cadence") {
      // EVM → Cadence (reverse bridge)
      transferRoute = "evm-to-cadence"
      txHash = await fcl.mutate({
        cadence: getEVMToCadenceTx(tokenConfig),
        args: (arg: any, t: any) => [
          arg(formattedAmount, t.UFix64),
          arg(to, t.Address),
        ],
        limit: 9999,
      })
    } else {
      throw new Error(`FlowKit: Cannot determine transfer route from ${fromVM} to ${toVM}`)
    }

    return {
      txHash,
      vm: route,
      explorerUrl: getExplorerUrl(txHash),
      token: tokenConfig.symbol,
      route: transferRoute,
    }
  } catch (error: any) {
    throw new Error(
      `FlowKit transfer failed: ${error.message}\n` +
      `Token: ${tokenConfig.symbol}, Route: ${fromVM} → ${toVM}, Amount: ${amount}`
    )
  }
}

/**
 * Estimate gas for a transfer (placeholder for future implementation)
 */
export async function estimateTransferGas(params: TransferParams): Promise<number> {
  const { token, to, from } = params
  const tokenConfig = getTokenConfig(token)
  const route = detectTransferRoute(from ?? "0x0000000000000000", to)

  // Rough estimates based on route
  const estimates = {
    "cadence": 100,
    "evm": 21000,
    "cross-vm": 500,
  }

  return estimates[route] || 100
}
