import * as fcl from "@onflow/fcl"
import { detectVM } from "./detect"
import { getExplorerUrl, getConfig } from "./client"
import type { 
  NFTTransferParams, 
  NFTTransferResult, 
  NFTMetadata, 
  NFTCollectionConfig,
  NFTBalanceResult 
} from "./types"

/**
 * nft.ts — Cross-VM NFT transfers with automatic routing
 * 
 * Supports Cadence NFTs ↔ EVM ERC-721 via Flow's official Cross-VM Bridge.
 * Automatically detects VM and routes transactions appropriately.
 */

// ─── NFT Collection Registry ──────────────────────────────────────

export const NFT_COLLECTIONS: Record<string, NFTCollectionConfig> = {
  // Example: NBA Top Shot
  "TopShot": {
    name: "NBA Top Shot",
    cadenceContract: "TopShot",
    cadenceAddress: "0x0b2a3299cc857e29", // mainnet
    evmContract: "0x...", // ERC-721 address (if bridged)
    collectionPath: "/storage/MomentCollection",
    collectionPublicPath: "/public/MomentCollection",
    metadataViews: true,
  },
  // Example: Flovatar
  "Flovatar": {
    name: "Flovatar",
    cadenceContract: "Flovatar",
    cadenceAddress: "0x921ea449dffec68a", // mainnet
    evmContract: "0x...",
    collectionPath: "/storage/FlovatarCollection",
    collectionPublicPath: "/public/FlovatarCollection",
    metadataViews: true,
  },
}

// Testnet overrides
const TESTNET_NFT_COLLECTIONS: Record<string, Partial<NFTCollectionConfig>> = {
  "TopShot": {
    cadenceAddress: "0x877931736ee77cff",
  },
  "Flovatar": {
    cadenceAddress: "0x9392a4a7c3f49a0b",
  },
}

/**
 * Get NFT collection configuration
 */
export function getNFTCollectionConfig(
  collection: string,
  network: "mainnet" | "testnet" | "emulator" = "mainnet"
): NFTCollectionConfig {
  const baseConfig = NFT_COLLECTIONS[collection]
  if (!baseConfig) {
    throw new Error(`FlowKit: Unknown NFT collection "${collection}"`)
  }

  if (network === "testnet" && TESTNET_NFT_COLLECTIONS[collection]) {
    return { ...baseConfig, ...TESTNET_NFT_COLLECTIONS[collection] }
  }

  return baseConfig
}

// ─── Cadence: NFT transfer within Cadence ────────────────────────

function getCadenceNFTTransferTx(config: NFTCollectionConfig): string {
  return `
import NonFungibleToken from 0xNonFungibleToken
import ${config.cadenceContract} from ${config.cadenceAddress}

transaction(nftID: UInt64, recipient: Address) {
  let withdrawRef: auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}
  let depositRef: &{NonFungibleToken.Receiver}

  prepare(signer: auth(BorrowValue) &Account) {
    // Borrow sender's collection
    self.withdrawRef = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>(
      from: ${config.collectionPath}
    ) ?? panic("Could not borrow NFT collection")
    
    // Get recipient's receiver capability
    let recipient = getAccount(recipient)
    self.depositRef = recipient.capabilities.borrow<&{NonFungibleToken.Receiver}>(
      ${config.collectionPublicPath}
    ) ?? panic("Could not borrow NFT receiver from recipient")
  }

  execute {
    let nft <- self.withdrawRef.withdraw(withdrawID: nftID)
    self.depositRef.deposit(token: <-nft)
  }
}
`
}

// ─── Cross-VM: Cadence → EVM NFT transfer ────────────────────────

function getCadenceToEVMNFTTx(config: NFTCollectionConfig): string {
  return `
import NonFungibleToken from 0xNonFungibleToken
import ${config.cadenceContract} from ${config.cadenceAddress}
import FlowEVMBridge from 0xFlowEVMBridge
import EVM from 0xEVM

transaction(nftID: UInt64, evmRecipient: String) {
  let nft: @{NonFungibleToken.NFT}
  let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount

  prepare(signer: auth(BorrowValue, Storage) &Account) {
    // Borrow COA
    self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found. Call connect() with withEVM: true first.")
    
    // Withdraw NFT from Cadence collection
    let collectionRef = signer.storage.borrow<auth(NonFungibleToken.Withdraw) &{NonFungibleToken.Collection}>(
      from: ${config.collectionPath}
    ) ?? panic("Could not borrow NFT collection")
    
    self.nft <- collectionRef.withdraw(withdrawID: nftID)
  }

  execute {
    // Bridge NFT to EVM via FlowEVMBridge
    let evmNFTID = FlowEVMBridge.bridgeNFTToEVM(
      nft: <-self.nft,
      to: self.coa
    )
    
    // Transfer ERC-721 from COA to recipient
    let evmAddr = EVM.addressFromString(evmRecipient)
    let nftContractAddr = FlowEVMBridge.getEVMContractAddress(
      cadenceAddress: ${config.cadenceAddress},
      cadenceContract: "${config.cadenceContract}"
    )
    
    // ERC-721 safeTransferFrom(address,address,uint256)
    let transferSelector = "42842e0e" // safeTransferFrom(address,address,uint256)
    let fromPadded = self.coa.address().toString().slice(from: 2).padStart(64, "0")
    let toPadded = evmRecipient.slice(from: 2).padStart(64, "0")
    let tokenIDHex = evmNFTID.toString(radix: 16).padStart(64, "0")
    let calldata = transferSelector.concat(fromPadded).concat(toPadded).concat(tokenIDHex).decodeHex()
    
    let result = self.coa.call(
      to: nftContractAddr,
      data: calldata,
      gasLimit: 200000,
      value: EVM.Balance(attoflow: 0)
    )
    
    assert(result.status == EVM.Status.successful, message: "ERC-721 transfer failed")
  }
}
`
}

// ─── Cross-VM: EVM → Cadence NFT transfer ────────────────────────

function getEVMToCadenceNFTTx(config: NFTCollectionConfig): string {
  return `
import NonFungibleToken from 0xNonFungibleToken
import ${config.cadenceContract} from ${config.cadenceAddress}
import FlowEVMBridge from 0xFlowEVMBridge
import EVM from 0xEVM

transaction(evmTokenID: UInt256, cadenceRecipient: Address) {
  let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount
  let nft: @{NonFungibleToken.NFT}

  prepare(signer: auth(BorrowValue) &Account) {
    // Borrow COA
    self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA found")
    
    // Get EVM NFT contract address
    let nftContractAddr = FlowEVMBridge.getEVMContractAddress(
      cadenceAddress: ${config.cadenceAddress},
      cadenceContract: "${config.cadenceContract}"
    )
    
    // Transfer ERC-721 from COA to bridge
    let bridgeAddr = FlowEVMBridge.getBridgeAddress()
    let transferSelector = "42842e0e" // safeTransferFrom
    let fromPadded = self.coa.address().toString().slice(from: 2).padStart(64, "0")
    let toPadded = bridgeAddr.toString().slice(from: 2).padStart(64, "0")
    let tokenIDHex = evmTokenID.toString(radix: 16).padStart(64, "0")
    let calldata = transferSelector.concat(fromPadded).concat(toPadded).concat(tokenIDHex).decodeHex()
    
    let result = self.coa.call(
      to: nftContractAddr,
      data: calldata,
      gasLimit: 200000,
      value: EVM.Balance(attoflow: 0)
    )
    
    assert(result.status == EVM.Status.successful, message: "ERC-721 transfer to bridge failed")
    
    // Bridge NFT from EVM to Cadence
    self.nft <- FlowEVMBridge.bridgeNFTFromEVM(
      evmContractAddress: nftContractAddr,
      evmTokenID: evmTokenID,
      from: self.coa
    )
  }

  execute {
    // Deposit to recipient's Cadence collection
    let recipient = getAccount(cadenceRecipient)
    let receiverRef = recipient.capabilities.borrow<&{NonFungibleToken.Receiver}>(
      ${config.collectionPublicPath}
    ) ?? panic("Could not borrow NFT receiver from recipient")
    
    receiverRef.deposit(token: <-self.nft)
  }
}
`
}

// ─── EVM: Native ERC-721 transfer ────────────────────────────────

async function transferERC721(
  contractAddress: string,
  tokenId: string,
  to: string
): Promise<string> {
  const provider = (window as any).ethereum
  if (!provider) throw new Error("No EVM provider found")

  const accounts = await provider.request({ method: "eth_accounts", params: [] })
  const from = accounts[0]

  // ERC-721 safeTransferFrom(address,address,uint256) = 0x42842e0e
  const transferSelector = "42842e0e"
  const fromPadded = from.slice(2).padStart(64, "0")
  const toPadded = to.slice(2).padStart(64, "0")
  const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, "0")
  const data = `0x${transferSelector}${fromPadded}${toPadded}${tokenIdHex}`

  const txHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from,
      to: contractAddress,
      data,
      gas: "0x30d40", // 200000
    }],
  })

  return txHash
}

// ─── Main NFT transfer function ──────────────────────────────────

/**
 * Transfer an NFT between Flow addresses.
 * Automatically detects VM and routes to the correct transaction.
 *
 * @example
 * // Cadence → Cadence
 * await transferNFT({ 
 *   collection: 'TopShot', 
 *   tokenId: '12345', 
 *   to: '0x1d007d...' 
 * })
 *
 * // Cadence → EVM (cross-VM bridge)
 * await transferNFT({ 
 *   collection: 'Flovatar', 
 *   tokenId: '67890', 
 *   to: '0xAbCd1234...' 
 * })
 *
 * // EVM → EVM
 * await transferNFT({ 
 *   collection: '0x1234...', // ERC-721 contract
 *   tokenId: '999', 
 *   from: '0xAbCd...', 
 *   to: '0xDeF0...' 
 * })
 */
export async function transferNFT(params: NFTTransferParams): Promise<NFTTransferResult> {
  const { collection, tokenId, to, from } = params

  // Get configuration
  const config = getConfig()
  const toVM = detectVM(to)
  const fromVM = from ? detectVM(from) : "cadence"

  let txHash: string
  let route: NFTTransferResult["route"]

  try {
    // Check if collection is an EVM contract address (ERC-721)
    if (collection.startsWith("0x") && collection.length === 42) {
      // EVM → EVM transfer
      if (fromVM !== "evm" || toVM !== "evm") {
        throw new Error("Custom ERC-721 contracts only support EVM → EVM transfers")
      }
      route = "evm-to-evm"
      txHash = await transferERC721(collection, tokenId, to)
    } else {
      // Named collection (Cadence-based)
      const collectionConfig = getNFTCollectionConfig(collection, config.network)

      if (fromVM === "cadence" && toVM === "cadence") {
        // Cadence → Cadence
        route = "cadence-to-cadence"
        txHash = await fcl.mutate({
          cadence: getCadenceNFTTransferTx(collectionConfig),
          args: (arg: any, t: any) => [
            arg(tokenId, t.UInt64),
            arg(to, t.Address),
          ],
          limit: 999,
        })
      } else if (fromVM === "cadence" && toVM === "evm") {
        // Cadence → EVM (cross-VM bridge)
        route = "cadence-to-evm"
        txHash = await fcl.mutate({
          cadence: getCadenceToEVMNFTTx(collectionConfig),
          args: (arg: any, t: any) => [
            arg(tokenId, t.UInt64),
            arg(to, t.String),
          ],
          limit: 9999,
        })
      } else if (fromVM === "evm" && toVM === "cadence") {
        // EVM → Cadence (reverse bridge)
        route = "evm-to-cadence"
        txHash = await fcl.mutate({
          cadence: getEVMToCadenceNFTTx(collectionConfig),
          args: (arg: any, t: any) => [
            arg(tokenId, t.UInt256),
            arg(to, t.Address),
          ],
          limit: 9999,
        })
      } else {
        throw new Error(`FlowKit: Cannot determine NFT transfer route from ${fromVM} to ${toVM}`)
      }
    }

    return {
      txHash,
      vm: fromVM === toVM ? fromVM : "cross-vm",
      explorerUrl: getExplorerUrl(txHash),
      collection,
      tokenId,
      route,
    }
  } catch (error: any) {
    throw new Error(
      `FlowKit NFT transfer failed: ${error.message}\n` +
      `Collection: ${collection}, TokenID: ${tokenId}, Route: ${fromVM} → ${toVM}`
    )
  }
}

// ─── NFT Metadata Fetching ───────────────────────────────────────

/**
 * Fetch NFT metadata from Cadence using MetadataViews
 */
async function fetchCadenceNFTMetadata(
  address: string,
  collection: string,
  tokenId: string
): Promise<NFTMetadata> {
  const config = getNFTCollectionConfig(collection)

  const script = `
import NonFungibleToken from 0xNonFungibleToken
import MetadataViews from 0xMetadataViews
import ${config.cadenceContract} from ${config.cadenceAddress}

access(all) fun main(address: Address, id: UInt64): {String: AnyStruct} {
  let account = getAccount(address)
  let collectionRef = account.capabilities.borrow<&{NonFungibleToken.Collection}>(
    ${config.collectionPublicPath}
  ) ?? panic("Could not borrow collection")
  
  let nft = collectionRef.borrowNFT(id)
  
  // Try to get Display view
  if let display = nft.resolveView(Type<MetadataViews.Display>()) as? MetadataViews.Display {
    return {
      "name": display.name,
      "description": display.description,
      "thumbnail": display.thumbnail.uri(),
      "id": id.toString()
    }
  }
  
  return {
    "id": id.toString(),
    "name": "NFT #".concat(id.toString()),
    "description": "",
    "thumbnail": ""
  }
}
`

  try {
    const result = await fcl.query({
      cadence: script,
      args: (arg: any, t: any) => [
        arg(address, t.Address),
        arg(tokenId, t.UInt64),
      ],
    }) as any

    return {
      tokenId,
      name: result.name || `NFT #${tokenId}`,
      description: result.description || "",
      image: result.thumbnail || "",
      collection,
      vm: "cadence",
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch Cadence NFT metadata: ${error.message}`)
  }
}

/**
 * Fetch NFT metadata from EVM using ERC-721 tokenURI
 */
async function fetchEVMNFTMetadata(
  contractAddress: string,
  tokenId: string
): Promise<NFTMetadata> {
  const provider = (window as any).ethereum
  if (!provider) throw new Error("No EVM provider found")

  // ERC-721 tokenURI(uint256) = 0xc87b56dd
  const tokenURISelector = "c87b56dd"
  const tokenIdHex = BigInt(tokenId).toString(16).padStart(64, "0")
  const data = `0x${tokenURISelector}${tokenIdHex}`

  try {
    const result = await provider.request({
      method: "eth_call",
      params: [{
        to: contractAddress,
        data,
      }, "latest"],
    })

    // Decode the result (simplified - in production use proper ABI decoder)
    // Result is hex-encoded string, need to parse it
    const uri = decodeURIFromHex(result)

    // Fetch metadata JSON from URI
    const response = await fetch(uri)
    const metadata = await response.json()

    return {
      tokenId,
      name: metadata.name || `NFT #${tokenId}`,
      description: metadata.description || "",
      image: metadata.image || "",
      collection: contractAddress,
      vm: "evm",
      attributes: metadata.attributes,
    }
  } catch (error: any) {
    // Fallback if tokenURI fails
    return {
      tokenId,
      name: `NFT #${tokenId}`,
      description: "",
      image: "",
      collection: contractAddress,
      vm: "evm",
    }
  }
}

function decodeURIFromHex(hex: string): string {
  // Simplified decoder - in production use proper ABI decoder
  const cleaned = hex.slice(2) // Remove 0x
  const bytes = cleaned.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  return String.fromCharCode(...bytes.filter(b => b > 0))
}

/**
 * Get NFT metadata from any VM
 *
 * @example
 * const metadata = await getNFTMetadata('0x1d007d...', 'TopShot', '12345')
 * console.log(metadata.name, metadata.image)
 */
export async function getNFTMetadata(
  address: string,
  collection: string,
  tokenId: string
): Promise<NFTMetadata> {
  const vm = detectVM(address)

  if (vm === "cadence") {
    return fetchCadenceNFTMetadata(address, collection, tokenId)
  } else if (vm === "evm") {
    // For EVM, collection should be the contract address
    return fetchEVMNFTMetadata(collection, tokenId)
  } else {
    throw new Error(`FlowKit: Cannot fetch metadata for unknown VM`)
  }
}

// ─── NFT Balance Queries ─────────────────────────────────────────

/**
 * Get NFT IDs owned by an address in a specific collection
 */
export async function getNFTBalance(
  address: string,
  collection: string
): Promise<NFTBalanceResult> {
  const vm = detectVM(address)
  const config = getConfig()

  if (vm === "cadence") {
    const collectionConfig = getNFTCollectionConfig(collection, config.network)

    const script = `
import NonFungibleToken from 0xNonFungibleToken
import ${collectionConfig.cadenceContract} from ${collectionConfig.cadenceAddress}

access(all) fun main(address: Address): [UInt64] {
  let account = getAccount(address)
  let collectionRef = account.capabilities.borrow<&{NonFungibleToken.Collection}>(
    ${collectionConfig.collectionPublicPath}
  )
  
  if collectionRef == nil {
    return []
  }
  
  return collectionRef!.getIDs()
}
`

    const ids = await fcl.query({
      cadence: script,
      args: (arg: any, t: any) => [arg(address, t.Address)],
    }) as any[]

    return {
      collection,
      tokenIds: ids.map((id: any) => id.toString()),
      count: ids.length,
      vm: "cadence",
    }
  } else if (vm === "evm") {
    // For EVM, use ERC-721 balanceOf
    const provider = (window as any).ethereum
    if (!provider) throw new Error("No EVM provider found")

    // ERC-721 balanceOf(address) = 0x70a08231
    const balanceOfSelector = "70a08231"
    const addressPadded = address.slice(2).padStart(64, "0")
    const data = `0x${balanceOfSelector}${addressPadded}`

    const result = await provider.request({
      method: "eth_call",
      params: [{
        to: collection, // collection should be ERC-721 contract address
        data,
      }, "latest"],
    })

    const count = parseInt(result, 16)

    // Note: Getting individual token IDs requires enumeration or events
    // This is a simplified version
    return {
      collection,
      tokenIds: [], // Would need tokenOfOwnerByIndex to populate
      count,
      vm: "evm",
    }
  } else {
    throw new Error(`FlowKit: Cannot query NFT balance for unknown VM`)
  }
}
