# Changelog

All notable changes to FlowKit are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-03-31

### Added
- `init()` — one-time SDK configuration with network presets (mainnet/testnet/emulator)
- `connect()` — unified FCL authentication + automatic COA creation for EVM access
- `disconnect()` — clean session termination
- `subscribe()` — reactive user state subscription
- `transfer()` — single API for Cadence→Cadence, Cadence→EVM, and EVM→Cadence FLOW transfers
- `batch()` — atomic multi-EVM-call execution via single Cadence transaction
- `sponsor()` — gas fee delegation (user pays zero, backend sponsor covers fees)
- `balance()` — unified FLOW balance query across both Cadence vault and COA
- `detectVM()` — automatic address-to-VM detection (8-byte Cadence vs 20-byte EVM)
- `detectTransferRoute()` — automatic routing logic for all transfer paths
- React hooks: `FlowKitProvider`, `useFlowConnect`, `useFlowTransfer`, `useCrossVMBalance`, `useAtomicBatch`, `useGasSponsor`
- Interactive HTML demo (`demo/index.html`) — live VM detection, transfer routing visualization, transaction log
- Full TypeScript types for all public APIs
- Jest unit test suite with FCL mock

### Architecture
- Monorepo structure with `src/` (SDK core) and `hooks/` (React layer)
- Network config presets eliminate boilerplate for all three environments
- Cadence transactions embedded as template literals — zero external dependencies beyond FCL

### Known Limitations (v0.1)
- Token support: FLOW only (USDC, USDT, custom ERC-20 coming in v0.2)
- Batch: EVM calls only, max 10 per batch
- Sponsor: requires backend co-signer service (client-side half provided)

---

## Roadmap

| Version | Focus |
|---------|-------|
| v0.2 | USDC + arbitrary FT/ERC-20 transfers |
| v0.3 | NFT transfers (cross-VM, metadata, balance) |
| v0.4 | Gas estimation, fee optimization |
| v0.5 | Additional React hooks (`useNFTCollection`, `useMultiTokenBalance`) |
| v1.0 | Security audit, npm publish, GrantDAO submission |
