/**
 * Complete FlowKit Hooks Application Example
 * 
 * Demonstrates all hooks working together in a real dApp.
 */

import React from "react"
import {
  FlowKitProvider,
  useFlowConnect,
  useFlowTransfer,
  useCrossVMBalance,
  useMultiTokenBalance,
  useAtomicBatch,
  useGasSponsor,
} from "../index"

// ─── Main App Component ───────────────────────────────────────────

export function CompleteApp() {
  return (
    <FlowKitProvider network="testnet" appName="FlowKit Demo">
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        <Header />
        <Dashboard />
      </div>
    </FlowKitProvider>
  )
}

// ─── Header with Connect Button ──────────────────────────────────

function Header() {
  const { connect, disconnect, user, isConnected, isLoading } = useFlowConnect({
    onSuccess: (user) => {
      console.log("Connected:", user.cadenceAddress)
    },
  })

  return (
    <header style={{ borderBottom: "2px solid #ccc", paddingBottom: "20px", marginBottom: "20px" }}>
      <h1>FlowKit Demo dApp</h1>

      {!isConnected ? (
        <button onClick={() => connect()} disabled={isLoading} style={buttonStyle}>
          {isLoading ? "Connecting..." : "Connect Wallet"}
        </button>
      ) : (
        <div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Cadence:</strong> {user?.cadenceAddress}
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>EVM:</strong> {user?.evmAddress}
          </div>
          <button onClick={disconnect} style={buttonStyle}>
            Disconnect
          </button>
        </div>
      )}
    </header>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────

function Dashboard() {
  const { isConnected } = useFlowConnect()

  if (!isConnected) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        <p>Please connect your wallet to continue</p>
      </div>
    )
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
      <PortfolioCard />
      <TransferCard />
      <DeFiCard />
      <SponsorCard />
    </div>
  )
}

// ─── Portfolio Card ───────────────────────────────────────────────

function PortfolioCard() {
  const { user } = useFlowConnect()
  const { balances, isLoading, refetch } = useMultiTokenBalance(
    user?.cadenceAddress,
    ["FLOW", "USDC", "USDT"],
    { refetchInterval: 30000 }
  )

  return (
    <Card title="Portfolio">
      {isLoading ? (
        <p>Loading balances...</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Token</th>
                <th style={tableHeaderStyle}>Cadence</th>
                <th style={tableHeaderStyle}>EVM</th>
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {balances &&
                Object.entries(balances).map(([token, balance]) => (
                  <tr key={token}>
                    <td style={tableCellStyle}>
                      <strong>{token}</strong>
                    </td>
                    <td style={tableCellStyle}>{balance.cadence}</td>
                    <td style={tableCellStyle}>{balance.evm}</td>
                    <td style={tableCellStyle}>
                      <strong>{balance.total}</strong>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <button onClick={refetch} style={{ ...buttonStyle, marginTop: "10px" }}>
            Refresh
          </button>
        </>
      )}
    </Card>
  )
}

// ─── Transfer Card ────────────────────────────────────────────────

function TransferCard() {
  const [token, setToken] = React.useState<"FLOW" | "USDC" | "USDT">("USDC")
  const [amount, setAmount] = React.useState("")
  const [recipient, setRecipient] = React.useState("")

  const { transfer, isLoading, isSuccess, error, reset } = useFlowTransfer({
    onSuccess: (result) => {
      console.log("Transfer complete:", result.txHash)
      setAmount("")
      setRecipient("")
      setTimeout(reset, 3000)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !recipient) return

    await transfer({ token, amount, to: recipient })
  }

  return (
    <Card title="Transfer">
      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label>Token:</label>
          <select value={token} onChange={(e) => setToken(e.target.value as any)} style={inputStyle}>
            <option value="FLOW">FLOW</option>
            <option value="USDC">USDC</option>
            <option value="USDT">USDT</option>
          </select>
        </div>

        <div style={formGroupStyle}>
          <label>Amount:</label>
          <input
            type="text"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={formGroupStyle}>
          <label>Recipient:</label>
          <input
            type="text"
            placeholder="0x..."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={inputStyle}
          />
        </div>

        <button type="submit" disabled={isLoading} style={buttonStyle}>
          {isLoading ? "Transferring..." : `Transfer ${token}`}
        </button>

        {isSuccess && <p style={{ color: "green", marginTop: "10px" }}>✓ Transfer successful!</p>}
        {error && <p style={{ color: "red", marginTop: "10px" }}>✗ {error.message}</p>}
      </form>
    </Card>
  )
}

// ─── DeFi Card ────────────────────────────────────────────────────

function DeFiCard() {
  const [depositAmount, setDepositAmount] = React.useState("")
  const { batch, isLoading, isSuccess, error, reset } = useAtomicBatch({
    onSuccess: (result) => {
      console.log("Batch complete:", result.txHash)
      setDepositAmount("")
      setTimeout(reset, 3000)
    },
  })

  const handleDeposit = async () => {
    if (!depositAmount) return

    // Mock contract addresses
    const USDC_CONTRACT = "0x1234567890123456789012345678901234567890"
    const VAULT_CONTRACT = "0x0987654321098765432109876543210987654321"

    await batch([
      {
        contractAddress: USDC_CONTRACT,
        calldata: `0x095ea7b3${VAULT_CONTRACT.slice(2).padStart(64, "0")}${BigInt(depositAmount).toString(16).padStart(64, "0")}`,
      },
      {
        contractAddress: VAULT_CONTRACT,
        calldata: `0xb6b55f25${BigInt(depositAmount).toString(16).padStart(64, "0")}`,
      },
    ])
  }

  return (
    <Card title="DeFi Deposit">
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
        Approve + Deposit in ONE transaction (atomic)
      </p>

      <div style={formGroupStyle}>
        <label>Amount:</label>
        <input
          type="text"
          placeholder="0.0"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          style={inputStyle}
        />
      </div>

      <button onClick={handleDeposit} disabled={isLoading} style={buttonStyle}>
        {isLoading ? "Processing..." : "Approve & Deposit"}
      </button>

      {isSuccess && <p style={{ color: "green", marginTop: "10px" }}>✓ Deposited successfully!</p>}
      {error && <p style={{ color: "red", marginTop: "10px" }}>✗ {error.message}</p>}
    </Card>
  )
}

// ─── Sponsor Card ─────────────────────────────────────────────────

function SponsorCard() {
  const [username, setUsername] = React.useState("")
  const { sponsor, isLoading, error } = useGasSponsor({
    sponsor: "0xSponsorAddress",
    onSuccess: (result) => {
      console.log("Sponsored TX:", result.txHash)
      setUsername("")
    },
  })

  const handleCreateProfile = async () => {
    if (!username) return

    const CREATE_PROFILE_TX = `
      transaction(username: String) {
        prepare(signer: auth(Storage) &Account) {
          // Create profile logic
        }
      }
    `

    await sponsor(CREATE_PROFILE_TX, (arg: any, t: any) => [arg(username, t.String)])
  }

  return (
    <Card title="Sponsored Transaction">
      <p style={{ fontSize: "14px", color: "#666", marginBottom: "15px" }}>
        User pays <strong style={{ color: "#00ff88" }}>$0</strong> - sponsor covers gas
      </p>

      <div style={formGroupStyle}>
        <label>Username:</label>
        <input
          type="text"
          placeholder="alice"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />
      </div>

      <button onClick={handleCreateProfile} disabled={isLoading} style={buttonStyle}>
        {isLoading ? "Creating..." : "Create Profile (Free!)"}
      </button>

      {error && <p style={{ color: "red", marginTop: "10px" }}>✗ {error.message}</p>}
    </Card>
  )
}

// ─── Reusable Card Component ──────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={cardStyle}>
      <h2 style={{ marginBottom: "15px", fontSize: "18px" }}>{title}</h2>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "20px",
  backgroundColor: "#fff",
}

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  backgroundColor: "#00d4ff",
  color: "#000",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "14px",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px",
  border: "1px solid #ddd",
  borderRadius: "4px",
  fontSize: "14px",
}

const formGroupStyle: React.CSSProperties = {
  marginBottom: "15px",
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px",
  borderBottom: "2px solid #ddd",
  fontSize: "12px",
  color: "#666",
}

const tableCellStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #eee",
  fontSize: "14px",
}
