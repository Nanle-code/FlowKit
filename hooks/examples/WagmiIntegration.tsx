/**
 * FlowKit + Wagmi/RainbowKit Integration Example
 * 
 * Shows how to use FlowKit alongside wagmi for hybrid Cadence + EVM dApps.
 * Users can connect to both Flow (Cadence) and Ethereum (EVM) simultaneously.
 */

import React from "react"
import { WagmiConfig, createConfig, useAccount, useConnect, useDisconnect } from "wagmi"
import { mainnet, polygon } from "wagmi/chains"
import { FlowKitProvider, useFlowConnect, useFlowTransfer, useCrossVMBalance } from "../index"

// ─── Hybrid Wallet Connection ─────────────────────────────────────

/**
 * Connect to both Flow and Ethereum
 */
export function HybridConnectButton() {
  // Flow connection
  const {
    connect: connectFlow,
    disconnect: disconnectFlow,
    user: flowUser,
    isConnected: isFlowConnected,
  } = useFlowConnect()

  // Ethereum connection (wagmi)
  const { address: ethAddress, isConnected: isEthConnected } = useAccount()
  const { connect: connectEth } = useConnect()
  const { disconnect: disconnectEth } = useDisconnect()

  const handleConnectAll = async () => {
    await connectFlow()
    // connectEth() // Uncomment to auto-connect Ethereum too
  }

  const handleDisconnectAll = async () => {
    await disconnectFlow()
    disconnectEth()
  }

  return (
    <div>
      <h3>Wallet Status</h3>

      <div>
        <strong>Flow (Cadence):</strong>
        {isFlowConnected ? (
          <div>
            <p>✓ Connected</p>
            <p>Cadence: {flowUser?.cadenceAddress}</p>
            <p>EVM: {flowUser?.evmAddress}</p>
          </div>
        ) : (
          <p>✗ Not connected</p>
        )}
      </div>

      <div>
        <strong>Ethereum:</strong>
        {isEthConnected ? (
          <div>
            <p>✓ Connected</p>
            <p>Address: {ethAddress}</p>
          </div>
        ) : (
          <p>✗ Not connected</p>
        )}
      </div>

      {!isFlowConnected || !isEthConnected ? (
        <button onClick={handleConnectAll}>Connect All Wallets</button>
      ) : (
        <button onClick={handleDisconnectAll}>Disconnect All</button>
      )}
    </div>
  )
}

// ─── Cross-Chain Balance Display ──────────────────────────────────

/**
 * Show balances across Flow Cadence, Flow EVM, and Ethereum mainnet
 */
export function CrossChainBalance() {
  const { user } = useFlowConnect()
  const { address: ethAddress } = useAccount()

  // Flow balances (Cadence + EVM)
  const { balance: flowBalance } = useCrossVMBalance(user?.cadenceAddress, "USDC")

  // Ethereum balance (via wagmi)
  // const { data: ethBalance } = useBalance({ address: ethAddress, token: USDC_ETH })

  return (
    <div>
      <h3>Multi-Chain Balances</h3>

      <div>
        <h4>Flow</h4>
        <p>Cadence: {flowBalance?.cadence} USDC</p>
        <p>EVM: {flowBalance?.evm} USDC</p>
        <p>
          <strong>Total: {flowBalance?.total} USDC</strong>
        </p>
      </div>

      <div>
        <h4>Ethereum</h4>
        <p>Mainnet: {/* {ethBalance?.formatted} USDC */} (via wagmi)</p>
      </div>
    </div>
  )
}

// ─── Cross-Chain Transfer ─────────────────────────────────────────

/**
 * Transfer tokens between Flow and Ethereum
 */
export function CrossChainTransfer() {
  const { transfer: transferFlow, isLoading: isFlowLoading } = useFlowTransfer()
  // const { sendTransaction: sendEth, isLoading: isEthLoading } = useSendTransaction()

  const handleFlowToEth = async () => {
    // 1. Transfer USDC from Flow Cadence to Flow EVM
    await transferFlow({
      token: "USDC",
      amount: "100",
      to: "0xFlowEVMAddress...", // Flow EVM address
    })

    // 2. Bridge from Flow EVM to Ethereum (via bridge contract)
    // await sendEth({ to: BRIDGE_CONTRACT, data: encodeBridge(...) })
  }

  return (
    <div>
      <h3>Cross-Chain Transfer</h3>
      <button onClick={handleFlowToEth} disabled={isFlowLoading}>
        {isFlowLoading ? "Transferring..." : "Flow → Ethereum"}
      </button>
    </div>
  )
}

// ─── Complete Hybrid App ──────────────────────────────────────────

export function HybridApp() {
  // Wagmi config
  const wagmiConfig = createConfig({
    autoConnect: true,
    // ... wagmi configuration
  })

  return (
    <WagmiConfig config={wagmiConfig}>
      <FlowKitProvider network="testnet" appName="Hybrid dApp">
        <div style={{ padding: "20px" }}>
          <h1>Hybrid Flow + Ethereum dApp</h1>
          <HybridConnectButton />
          <hr />
          <CrossChainBalance />
          <hr />
          <CrossChainTransfer />
        </div>
      </FlowKitProvider>
    </WagmiConfig>
  )
}
