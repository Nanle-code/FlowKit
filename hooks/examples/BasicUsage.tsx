/**
 * Basic FlowKit Hooks Usage Examples
 */

import React from "react"
import {
  FlowKitProvider,
  useFlowConnect,
  useFlowTransfer,
  useCrossVMBalance,
} from "../index"

// ─── Example 1: Simple Connect Button ────────────────────────────

export function ConnectButton() {
  const { connect, disconnect, user, isConnected, isLoading } = useFlowConnect({
    onSuccess: (user) => {
      console.log("Connected:", user.cadenceAddress)
    },
  })

  if (isConnected && user) {
    return (
      <div>
        <p>Cadence: {user.cadenceAddress}</p>
        <p>EVM: {user.evmAddress}</p>
        <button onClick={disconnect}>Disconnect</button>
      </div>
    )
  }

  return (
    <button onClick={() => connect()} disabled={isLoading}>
      {isLoading ? "Connecting..." : "Connect Wallet"}
    </button>
  )
}

// ─── Example 2: Transfer Form ────────────────────────────────────

export function TransferForm() {
  const [amount, setAmount] = React.useState("")
  const [recipient, setRecipient] = React.useState("")
  const [token, setToken] = React.useState<"FLOW" | "USDC" | "USDT">("USDC")

  const { transfer, isLoading, isSuccess, error } = useFlowTransfer({
    onSuccess: (result) => {
      console.log("Transfer complete:", result.txHash)
      console.log("Route:", result.route)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await transfer({ token, amount, to: recipient })
  }

  return (
    <form onSubmit={handleSubmit}>
      <select value={token} onChange={(e) => setToken(e.target.value as any)}>
        <option value="FLOW">FLOW</option>
        <option value="USDC">USDC</option>
        <option value="USDT">USDT</option>
      </select>

      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <input
        type="text"
        placeholder="Recipient address"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
      />

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Transferring..." : `Transfer ${token}`}
      </button>

      {isSuccess && <p style={{ color: "green" }}>✓ Transfer successful!</p>}
      {error && <p style={{ color: "red" }}>✗ {error.message}</p>}
    </form>
  )
}

// ─── Example 3: Balance Display ──────────────────────────────────

export function BalanceDisplay({ address }: { address: string }) {
  const { balance, isLoading, error, refetch } = useCrossVMBalance(address, "USDC")

  if (isLoading) return <p>Loading balance...</p>
  if (error) return <p>Error: {error.message}</p>
  if (!balance) return null

  return (
    <div>
      <h3>USDC Balance</h3>
      <p>Cadence: {balance.cadence}</p>
      <p>EVM: {balance.evm}</p>
      <p>
        <strong>Total: {balance.total}</strong>
      </p>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}

// ─── Example 4: Complete App ─────────────────────────────────────

export function App() {
  return (
    <FlowKitProvider network="testnet" appName="My dApp">
      <div style={{ padding: "20px" }}>
        <h1>FlowKit Demo</h1>
        <ConnectButton />
        <hr />
        <TransferForm />
        <hr />
        <BalanceDisplay address="0x1d007d755531709b" />
      </div>
    </FlowKitProvider>
  )
}
