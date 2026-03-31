# FlowKit

**The missing SDK layer between Flow Cadence and EVM**

One API. Zero VM complexity. Auto-routes everything.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Nanle-code/FlowKit) [![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing) [![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://nanle-code.github.io/FlowKit/) [![Network](https://img.shields.io/badge/network-Flow%20Testnet-00d4ff)](https://developers.flow.com) [![Built for](https://img.shields.io/badge/built%20for-PL__Genesis%202026-purple)](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app)

---

## 📖 Table of Contents

- [What is FlowKit?](#what-is-flowkit)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
- [React Hooks](#react-hooks)
- [Examples](#examples)
- [Advanced Usage](#advanced-usage)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## What is FlowKit?

FlowKit is a TypeScript SDK that abstracts Flow's dual-VM complexity (Cadence + EVM) into a single, unified API. It enables developers to build cross-VM applications without understanding the underlying bridge mechanics.

### The Problem

Flow has two virtual machines:
- **Cadence VM**: Flow's native, resource-oriented VM
- **EVM**: Ethereum Virtual Machine for Solidity compatibility

Bridging between them today requires:
- Understanding both FCL and viem/ethers
- Manually detecting address types (8-byte vs 20-byte)
- Writing custom Cadence transactions for cross-VM calls
- Setting up Cadence-Owned Accounts (COAs) manually
- Handling gas sponsorship from scratch

### The Solution

FlowKit solves this with **one unified API**:

```typescript
// Same function, automatic routing
await transfer({ token: 'USDC', amount: '100', to: address })
await transferNFT({ collection: 'TopShot', tokenId: '12345', to: address })
```

FlowKit automatically:
- Detects VM from address format
- Routes to correct transaction type
- Bridges cross-VM when needed (atomic)
- Handles COA creation
- Manages gas sponsorship

---

## Installation

```bash
npm install flowkit @onflow/fcl
```

### Requirements

- Node.js 16+
- React 18+ (for hooks)
- @onflow/fcl ^1.12.2

---

## Quick Start

### 1. Initialize FlowKit

```typescript
import { init } from 'flowkit'

init({
  network: 'testnet',  // 'mainnet' | 'testnet' | 'emulator'
  appName: 'My dApp',
})
```

### 2. Connect Wallet

```typescript
import { connect } from 'flowkit'

const user = await connect({ withEVM: true })

console.log(user.cadenceAddress)  // "0x1d007d755531709b"
console.log(user.evmAddress)      // "0xAbCd1234...EfGh"
```

The `withEVM: true` option automatically creates a Cadence-Owned Account (COA) for EVM access.

### 3. Transfer Tokens

```typescript
import { transfer } from 'flowkit'

// Cadence → Cadence
await transfer({ 
  token: 'FLOW', 
  amount: '10', 
  to: '0x1d007d755531709b' 
})

// Cadence → EVM (auto-bridges)
await transfer({ 
  token: 'USDC', 
  amount: '100', 
  to: '0xAbCd1234567890123456789012345678901234567890' 
})
```

### 4. Transfer NFTs

```typescript
import { transferNFT } from 'flowkit'

// Cadence → EVM (auto-bridges)
await transferNFT({
  collection: 'TopShot',
  tokenId: '12345',
  to: '0xAbCd...'
})
```

---

## Core Concepts

### Automatic VM Detection

FlowKit detects the VM from address format:

```typescript
'0x1d007d755531709b'                          // 8 bytes  → Cadence
'0xAbCd1234567890123456789012345678901234567890' // 20 bytes → EVM
```

This powers the automatic routing - you never need to specify the VM.

### Transfer Routes

FlowKit automatically chooses the correct route:

| From | To | Route | Method |
|------|-----|-------|--------|
| Cadence | Cadence | Same VM | FungibleToken transaction |
| Cadence | EVM | Cross-VM | Bridge via COA (atomic) |
| EVM | Cadence | Cross-VM | Reverse bridge (atomic) |
| EVM | EVM | Same VM | Standard ERC-20 transfer |

All cross-VM transfers are **atomic** - if any step fails, the entire transaction reverts.

### Supported Assets

**Fungible Tokens:**
- FLOW (native)
- USDC (mainnet + testnet)
- USDT (mainnet + testnet)
- Custom ERC-20 tokens

**NFTs:**
- NBA Top Shot
- Flovatar
- Custom ERC-721 tokens

---

## API Reference

### Setup Functions

#### `init(config)`

Initialize FlowKit with network configuration.

```typescript
init({
  network: 'testnet',      // Required: 'mainnet' | 'testnet' | 'emulator'
  appName: 'My dApp',      // Optional: Your app name
  accessNode?: string,     // Optional: Custom access node URL
})
```

#### `connect(options)`

Authenticate user and optionally create COA for EVM access.

```typescript
const user = await connect({ 
  withEVM: true  // Creates COA if it doesn't exist
})

// Returns:
{
  cadenceAddress: string,  // "0x1d007d..."
  evmAddress: string | null,  // "0xAbCd..." or null
  loggedIn: boolean
}
```

#### `disconnect()`

Log out the current user.

```typescript
await disconnect()
```

---

### Token Transfer Functions

#### `transfer(params)`

Transfer fungible tokens with automatic VM routing.

```typescript
await transfer({
  token: 'FLOW' | 'USDC' | 'USDT' | '0x...',  // Token symbol or contract address
  amount: string,                               // Amount as string
  to: string,                                   // Recipient address
  from?: string,                                // Optional: sender address
})

// Returns:
{
  txHash: string,
  vm: 'cadence' | 'evm' | 'cross-vm',
  explorerUrl: string,
  token: string,
  route: 'cadence-to-cadence' | 'cadence-to-evm' | 'evm-to-cadence' | 'evm-to-evm'
}
```

**Examples:**

```typescript
// FLOW transfer
await transfer({ token: 'FLOW', amount: '10', to: '0x1d007d...' })

// USDC transfer (Cadence → EVM)
await transfer({ token: 'USDC', amount: '100', to: '0xAbCd...' })

// Custom ERC-20
await transfer({ 
  token: '0x1234567890123456789012345678901234567890',
  amount: '50',
  to: '0xDeF0...'
})
```

---

### NFT Functions

#### `transferNFT(params)`

Transfer NFTs with automatic VM routing and bridging.

```typescript
await transferNFT({
  collection: string,  // Collection name or ERC-721 contract address
  tokenId: string,     // Token ID
  to: string,          // Recipient address
  from?: string,       // Optional: sender address
})

// Returns:
{
  txHash: string,
  vm: 'cadence' | 'evm' | 'cross-vm',
  explorerUrl: string,
  collection: string,
  tokenId: string,
  route: 'cadence-to-cadence' | 'cadence-to-evm' | 'evm-to-cadence' | 'evm-to-evm'
}
```

**Examples:**

```typescript
// Cadence → Cadence
await transferNFT({ 
  collection: 'TopShot', 
  tokenId: '12345', 
  to: '0x1d007d...' 
})

// Cadence → EVM (auto-bridges)
await transferNFT({ 
  collection: 'Flovatar', 
  tokenId: '67890', 
  to: '0xAbCd...' 
})

// Custom ERC-721
await transferNFT({ 
  collection: '0x1234...', 
  tokenId: '999', 
  to: '0xDeF0...' 
})
```

#### `getNFTMetadata(address, collection, tokenId)`

Fetch NFT metadata from any VM.

```typescript
const metadata = await getNFTMetadata(
  '0x1d007d...',  // Owner address
  'TopShot',      // Collection name
  '12345'         // Token ID
)

// Returns:
{
  tokenId: string,
  name: string,
  description: string,
  image: string,
  collection: string,
  vm: 'cadence' | 'evm',
  attributes?: Array<{ trait_type: string; value: any }>
}
```

#### `getNFTBalance(address, collection)`

Get all NFT IDs owned by an address in a collection.

```typescript
const balance = await getNFTBalance('0x1d007d...', 'TopShot')

// Returns:
{
  collection: string,
  tokenIds: string[],
  count: number,
  vm: 'cadence' | 'evm'
}
```

---

### Balance Functions

#### `balance(address, token?)`

Query token balance across both VMs.

```typescript
const bal = await balance('0x1d007d...', 'FLOW')

// Returns:
{
  cadence: string,  // Balance in Cadence vault
  evm: string,      // Balance in COA (EVM side)
  total: string,    // Sum of both
  tokens: { ... }
}
```

#### `getMultiTokenBalance(address, tokens)`

Query multiple token balances at once.

```typescript
const balances = await getMultiTokenBalance(
  '0x1d007d...',
  ['FLOW', 'USDC', 'USDT']
)

// Returns:
{
  FLOW: { cadence: '10.5', evm: '2.0', total: '12.5', ... },
  USDC: { cadence: '100', evm: '50', total: '150', ... },
  USDT: { cadence: '75', evm: '25', total: '100', ... }
}
```

---

### Batch Functions

#### `batch(calls)`

Execute multiple EVM calls atomically with one signature.

```typescript
await batch([
  { 
    contractAddress: '0xUSDC...', 
    calldata: encodeApprove(VAULT, amount) 
  },
  { 
    contractAddress: '0xVAULT...', 
    calldata: encodeDeposit(amount) 
  }
])

// If any call fails, all revert automatically
```

---

### Gas Sponsorship Functions

#### `sponsor(options)`

Execute transactions with zero gas fees for users.

```typescript
await sponsor({
  cadence: MY_TRANSACTION,
  args: (arg, t) => [arg('hello', t.String)],
  sponsor: '0xYourBackendAddress',
})

// User signs, sponsor pays gas
```

---

## React Hooks

FlowKit provides wagmi-style React hooks for easy integration.

### Setup

Wrap your app with `FlowKitProvider`:

```tsx
import { FlowKitProvider } from 'flowkit/hooks'

function App() {
  return (
    <FlowKitProvider network="testnet" appName="My dApp">
      <MyApp />
    </FlowKitProvider>
  )
}
```

### Connection Hooks

#### `useFlowConnect()`

Manage wallet connection.

```tsx
import { useFlowConnect } from 'flowkit/hooks'

function ConnectButton() {
  const { connect, disconnect, user, isConnected } = useFlowConnect()

  return (
    <div>
      {!isConnected ? (
        <button onClick={() => connect({ withEVM: true })}>
          Connect Wallet
        </button>
      ) : (
        <div>
          <p>Connected: {user?.cadenceAddress}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  )
}
```

### Transfer Hooks

#### `useFlowTransfer()`

Transfer tokens with loading states.

```tsx
import { useFlowTransfer } from 'flowkit/hooks'

function TransferButton() {
  const { transfer, isLoading, error } = useFlowTransfer()

  const handleTransfer = async () => {
    try {
      await transfer({
        token: 'USDC',
        amount: '100',
        to: '0xAbCd...'
      })
      alert('Transfer successful!')
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  return (
    <button onClick={handleTransfer} disabled={isLoading}>
      {isLoading ? 'Transferring...' : 'Transfer USDC'}
    </button>
  )
}
```

### Balance Hooks

#### `useCrossVMBalance(address, token, config?)`

Query token balance with auto-refresh.

```tsx
import { useCrossVMBalance } from 'flowkit/hooks'

function BalanceDisplay({ address }) {
  const { balance, isLoading, refetch } = useCrossVMBalance(
    address,
    'USDC',
    { refetchInterval: 10000 }  // Refresh every 10 seconds
  )

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <p>Balance: {balance?.total} USDC</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
```

### NFT Hooks

#### `useNFTTransfer()`

Transfer NFTs with loading states.

```tsx
import { useNFTTransfer } from 'flowkit/hooks'

function NFTTransferButton() {
  const { transfer, isLoading } = useNFTTransfer()

  return (
    <button onClick={() => transfer({
      collection: 'TopShot',
      tokenId: '12345',
      to: '0xAbCd...'
    })}>
      {isLoading ? 'Transferring...' : 'Transfer NFT'}
    </button>
  )
}
```

#### `useNFTMetadata(address, collection, tokenId)`

Fetch and display NFT metadata.

```tsx
import { useNFTMetadata } from 'flowkit/hooks'

function NFTCard({ address, collection, tokenId }) {
  const { metadata, isLoading } = useNFTMetadata(
    address,
    collection,
    tokenId
  )

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <img src={metadata?.image} alt={metadata?.name} />
      <h3>{metadata?.name}</h3>
      <p>{metadata?.description}</p>
    </div>
  )
}
```

#### `useNFTCollection(address, collection, config?)`

Fetch entire NFT collection.

```tsx
import { useNFTCollection } from 'flowkit/hooks'

function NFTGallery({ address }) {
  const { nfts, count, isLoading } = useNFTCollection(
    address,
    'Flovatar',
    { maxNFTs: 20 }
  )

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2>Your Flovatars ({count})</h2>
      <div className="grid">
        {nfts.map(nft => (
          <NFTCard key={nft.tokenId} {...nft} />
        ))}
      </div>
    </div>
  )
}
```

### All Available Hooks

**Connection:**
- `useFlowConnect()` - Wallet connection
- `useFlowUser()` - Get current user
- `useIsConnected()` - Check connection status

**Transfers:**
- `useFlowTransfer()` - Token transfers
- `usePrepareTransfer()` - Prepare transfer (gas estimation)

**Balances:**
- `useCrossVMBalance()` - Single token balance
- `useMultiTokenBalance()` - Multiple token balances
- `useWatchBalance()` - Real-time balance watching

**Batching:**
- `useAtomicBatch()` - Atomic multi-call
- `usePrepareBatch()` - Prepare batch
- `useDeFiBatch()` - Pre-built DeFi patterns

**Sponsorship:**
- `useGasSponsor()` - Zero-fee transactions
- `useNeedsSponsorship()` - Check if sponsorship needed
- `useSponsoredOnboarding()` - Sponsored onboarding flow

**NFTs:**
- `useNFTTransfer()` - NFT transfers
- `useNFTMetadata()` - NFT metadata
- `useNFTBalance()` - NFT balance
- `useNFTCollection()` - Full collection

---

## Examples

### Complete Token Transfer App

```tsx
import { FlowKitProvider, useFlowConnect, useFlowTransfer } from 'flowkit/hooks'

function TransferApp() {
  const { connect, user, isConnected } = useFlowConnect()
  const { transfer, isLoading } = useFlowTransfer()
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

  if (!isConnected) {
    return <button onClick={() => connect({ withEVM: true })}>Connect</button>
  }

  return (
    <div>
      <p>Connected: {user?.cadenceAddress}</p>
      <input 
        placeholder="Amount" 
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />
      <input 
        placeholder="Recipient" 
        value={recipient}
        onChange={e => setRecipient(e.target.value)}
      />
      <button 
        onClick={() => transfer({ token: 'USDC', amount, to: recipient })}
        disabled={isLoading}
      >
        {isLoading ? 'Sending...' : 'Send USDC'}
      </button>
    </div>
  )
}

export default function App() {
  return (
    <FlowKitProvider network="testnet" appName="Transfer App">
      <TransferApp />
    </FlowKitProvider>
  )
}
```

### NFT Marketplace

```tsx
import { useNFTTransfer, useNFTMetadata, useFlowTransfer } from 'flowkit/hooks'

function NFTListing({ tokenId, price, seller }) {
  const { metadata } = useNFTMetadata(seller, 'TopShot', tokenId)
  const { transfer: transferToken } = useFlowTransfer()
  const { transfer: transferNFT } = useNFTTransfer()

  const handleBuy = async () => {
    // Pay seller
    await transferToken({ token: 'USDC', amount: price, to: seller })
    
    // Receive NFT
    await transferNFT({
      collection: 'TopShot',
      tokenId,
      to: currentUser.address
    })
  }

  return (
    <div>
      <img src={metadata?.image} />
      <h3>{metadata?.name}</h3>
      <p>Price: {price} USDC</p>
      <button onClick={handleBuy}>Buy Now</button>
    </div>
  )
}
```

### DeFi Integration

```tsx
import { useAtomicBatch } from 'flowkit/hooks'

function DeFiDeposit() {
  const { batch, isLoading } = useAtomicBatch()

  const handleDeposit = async () => {
    // Approve + Deposit in one atomic transaction
    await batch([
      { 
        contractAddress: USDC_ADDRESS, 
        calldata: encodeApprove(VAULT_ADDRESS, amount) 
      },
      { 
        contractAddress: VAULT_ADDRESS, 
        calldata: encodeDeposit(amount) 
      }
    ])
  }

  return (
    <button onClick={handleDeposit} disabled={isLoading}>
      {isLoading ? 'Depositing...' : 'Deposit to Vault'}
    </button>
  )
}
```

### Wagmi Integration (Hybrid dApp)

```tsx
import { FlowKitProvider, useFlowConnect } from 'flowkit/hooks'
import { WagmiConfig, useAccount } from 'wagmi'

function HybridApp() {
  // Flow connection
  const { user: flowUser } = useFlowConnect()
  
  // Ethereum connection (via wagmi)
  const { address: ethAddress } = useAccount()

  return (
    <div>
      <p>Flow: {flowUser?.cadenceAddress}</p>
      <p>Ethereum: {ethAddress}</p>
      {/* Use both ecosystems seamlessly */}
    </div>
  )
}

export default function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <FlowKitProvider network="testnet" appName="Hybrid dApp">
        <HybridApp />
      </FlowKitProvider>
    </WagmiConfig>
  )
}
```

---

## Advanced Usage

### Custom Token Configuration

```typescript
import { getTokenConfig } from 'flowkit'

const config = getTokenConfig('USDC', 'mainnet')

console.log(config.cadenceContract)  // "FiatToken"
console.log(config.cadenceAddress)   // "0xb19436aae4d94622"
console.log(config.evmContract)      // "0xA0b86991..."
console.log(config.decimals)         // 6
```

### Gas Estimation

```typescript
import { estimateTransferGas } from 'flowkit'

const gasEstimate = await estimateTransferGas({
  token: 'USDC',
  amount: '100',
  to: '0xAbCd...'
})

console.log(`Estimated gas: ${gasEstimate}`)
```

### Error Handling

```typescript
import { transfer } from 'flowkit'

try {
  await transfer({ token: 'USDC', amount: '100', to: '0xAbCd...' })
} catch (error) {
  if (error.message.includes('No COA found')) {
    console.error('Need to create COA - call connect({ withEVM: true })')
  } else if (error.message.includes('insufficient balance')) {
    console.error('Not enough tokens')
  } else {
    console.error('Transfer failed:', error.message)
  }
}
```

### Network Configuration

```typescript
import { init } from 'flowkit'

// Mainnet
init({ network: 'mainnet', appName: 'My dApp' })

// Testnet
init({ network: 'testnet', appName: 'My dApp' })

// Custom access node
init({ 
  network: 'mainnet', 
  appName: 'My dApp',
  accessNode: 'https://my-custom-node.com'
})
```

---

## Troubleshooting

### Common Issues

**1. "No COA found" error**

Solution: Create a COA during connection:
```typescript
await connect({ withEVM: true })
```

**2. TypeScript errors with @onflow/fcl**

Solution: FlowKit includes type declarations. Make sure `src/fcl.d.ts` is in your project.

**3. Cross-VM transfer fails**

Check:
- COA exists (`connect({ withEVM: true })`)
- Sufficient balance in source VM
- Recipient address is valid
- Network is correct (mainnet/testnet)

**4. NFT metadata not loading**

Check:
- Collection name is correct ('TopShot', 'Flovatar')
- Token ID exists
- Address owns the NFT
- Network matches (mainnet/testnet)

**5. React hooks not working**

Make sure your app is wrapped with `FlowKitProvider`:
```tsx
<FlowKitProvider network="testnet" appName="My dApp">
  <App />
</FlowKitProvider>
```

### Debug Mode

Enable detailed logging:
```typescript
import { init } from 'flowkit'

init({ 
  network: 'testnet', 
  appName: 'My dApp',
  // Add custom logging here
})
```

---

## Architecture

### How It Works

```
Your dApp
    ↓
FlowKit SDK
    ↓
┌─────────────┬──────────────┐
│  Cadence VM │    EVM VM    │
│             │              │
│  FCL        │  COA Bridge  │
└─────────────┴──────────────┘
```

### Cross-VM Bridge

FlowKit uses Flow's official Cross-VM Bridge (FlowEVMBridge):

```
Cadence Asset
    ↓
FlowEVMBridge.bridgeToEVM()
    ↓
EVM Asset in COA
    ↓
Transfer to recipient
    ↓
EVM Asset in recipient

All steps are atomic ⚛️
```

### Cadence-Owned Accounts (COAs)

A COA is a special Cadence resource that:
- Has an EVM address
- Can hold EVM assets
- Can execute EVM transactions
- Is controlled by your Cadence account

FlowKit automatically creates and manages COAs for you.

---

## TypeScript Support

FlowKit is written in TypeScript and provides full type safety:

```typescript
import type {
  FlowKitConfig,
  FlowKitUser,
  TransferParams,
  TransferResult,
  NFTTransferParams,
  NFTMetadata,
  BalanceResult,
} from 'flowkit'
```

All functions have complete type definitions and JSDoc comments.

---

## Testing

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

---

## Build

```bash
# Build SDK
npm run build

# Watch mode
npm run dev

# Run demo
npm run demo
```

---

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

## Roadmap

- [x] v0.1 — FLOW transfers, COA management, batch, sponsor, balance
- [x] v0.2 — USDC and arbitrary FT/ERC-20 transfers
- [x] v0.3 — React hooks (15 wagmi-style hooks)
- [x] v0.4 — NFT support (cross-VM transfers, metadata, balance)
- [ ] v0.5 — NFT marketplace helpers, batch NFT transfers
- [ ] v0.6 — Enhanced caching and performance
- [ ] v0.7 — Gas estimation and fee optimization
- [ ] v1.0 — Full audit, npm publish

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Links

- **GitHub**: https://github.com/Nanle-code/FlowKit
- **Flow Documentation**: https://developers.flow.com
- **Flow Discord**: https://discord.gg/flow
- **Flow Forum**: https://forum.flow.com

---

## Acknowledgments

Built using:
- @onflow/fcl - Flow Client Library
- Flow's Cross-VM Bridge (FlowEVMBridge)
- Flow's MetadataViews standard
- ERC-20 and ERC-721 standards

---

**FlowKit - One API for Flow's Dual-VM Future** 🚀
