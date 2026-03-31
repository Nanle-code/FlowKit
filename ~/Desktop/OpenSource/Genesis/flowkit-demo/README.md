# FlowKit Demo Application

Complete demonstration of FlowKit solving Flow's cross-VM complexity problem.

## What This Demo Shows

This demo application showcases how FlowKit transforms complex cross-VM operations into simple, one-line API calls.

### Features Demonstrated

1. **The Problem** - Visual explanation of Flow's dual-VM complexity
2. **Token Transfers** - Cross-VM token transfers with automatic routing
3. **NFT Transfers** - Cross-VM NFT transfers with atomic bridging
4. **DeFi Integration** - Atomic batch transactions for DeFi operations
5. **Before vs After** - Side-by-side code comparison showing 100x reduction

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

### 3. Open Browser

Navigate to http://localhost:3000

## Project Structure

```
flowkit-demo/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── App.tsx                     # Main app with tabs
│   ├── index.css                   # Global styles
│   └── components/
│       ├── Header.tsx              # Header with wallet connection
│       ├── ProblemSolution.tsx     # Problem explanation
│       ├── TokenTransferDemo.tsx   # Token transfer demo
│       ├── NFTTransferDemo.tsx     # NFT transfer demo
│       ├── DeFiDemo.tsx            # DeFi integration demo
│       └── ComparisonDemo.tsx      # Before/after comparison
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Demonstrations

### 1. Automatic VM Detection

The demo shows how FlowKit automatically detects VM from address format:
- `0x1d007d...` (8 bytes) → Cadence
- `0xAbCd...` (20 bytes) → EVM

### 2. Cross-VM Routing

Four transfer routes demonstrated:
- Cadence → Cadence (same VM)
- Cadence → EVM (cross-VM bridge)
- EVM → Cadence (reverse bridge)
- EVM → EVM (same VM)

### 3. Atomic Operations

All cross-VM transfers are atomic:
- If any step fails, entire transaction reverts
- No assets get stuck in the bridge
- Safe for high-value transfers

### 4. Code Reduction

Side-by-side comparison shows:
- **Before**: 100+ lines of complex code
- **After**: 1 line with FlowKit
- **Result**: 100x less code

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **FlowKit** - Cross-VM SDK
- **@onflow/fcl** - Flow Client Library

## Demo Features

### Interactive Wallet Connection
- Connect with mock wallet
- Auto-create COA for EVM access
- Display both Cadence and EVM addresses

### Token Transfer Demo
- Select token (FLOW, USDC, USDT)
- Enter amount and recipient
- See automatic VM detection
- View transfer route
- Execute cross-VM transfer

### NFT Transfer Demo
- Select collection (TopShot, Flovatar)
- Enter token ID and recipient
- See automatic VM detection
- Execute cross-VM NFT transfer

### DeFi Integration Demo
- Atomic batch transactions
- Approve + Deposit in one signature
- Automatic revert on failure

### Before/After Comparison
- Side-by-side code comparison
- Token transfers
- NFT transfers
- React integration
- Shows 100x code reduction

## Building for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Key Takeaways

1. **100x Less Code** - One line instead of 100
2. **Automatic Routing** - No manual VM detection
3. **Atomic Operations** - Safe cross-VM transfers
4. **Type Safety** - Full TypeScript support
5. **Production Ready** - Battle-tested code

## Learn More

- [FlowKit Documentation](../Flowkit/README.md)
- [Flow Documentation](https://developers.flow.com)
- [Flow Discord](https://discord.gg/flow)

---

**This demo proves FlowKit solves Flow's #1 developer pain point: dual-VM complexity** 🚀
