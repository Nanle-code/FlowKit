/**
 * DeFi Use Case Examples with FlowKit Hooks
 */

import React from "react"
import {
  useFlowConnect,
  useFlowTransfer,
  useAtomicBatch,
  useCrossVMBalance,
  useMultiTokenBalance,
} from "../index"

// ─── Example 1: DeFi Deposit with Atomic Batch ───────────────────

export function DeFiDeposit() {
  const [amount, setAmount] = React.useState("")
  const { batch, isLoading, isSuccess, error } = useAtomicBatch({
    onSuccess: (result) => {
      console.log("Deposit complete:", result.txHash)
    },
  })

  const handleDeposit = async () => {
    const USDC_CONTRACT = "0x..."
    const VAULT_CONTRACT = "0x..."

    // Approve + Deposit in ONE transaction
    await batch([
      {
        contractAddress: USDC_CONTRACT,
        calldata: encodeApprove(VAULT_CONTRACT, amount),
      },
      {
        contractAddress: VAULT_CONTRACT,
        calldata: encodeDeposit(amount),
      },
    ])
  }

  return (
    <div>
      <h3>Deposit to Vault</h3>
      <input
        type="text"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handleDeposit} disabled={isLoading}>
        {isLoading ? "Processing..." : "Approve & Deposit"}
      </button>
      {isSuccess && <p>✓ Deposited successfully!</p>}
      {error && <p>✗ {error.message}</p>}
    </div>
  )
}

// ─── Example 2: Multi-Token Portfolio ────────────────────────────

export function Portfolio() {
  const { user } = useFlowConnect()
  const { balances, isLoading, refetch } = useMultiTokenBalance(
    user?.cadenceAddress,
    ["FLOW", "USDC", "USDT"],
    { refetchInterval: 30000 } // Auto-refresh every 30s
  )

  if (isLoading) return <p>Loading portfolio...</p>

  const totalUSD = calculateTotalUSD(balances)

  return (
    <div>
      <h3>Your Portfolio</h3>
      <p>
        <strong>Total Value: ${totalUSD.toFixed(2)}</strong>
      </p>

      <table>
        <thead>
          <tr>
            <th>Token</th>
            <th>Cadence</th>
            <th>EVM</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {balances &&
            Object.entries(balances).map(([token, balance]) => (
              <tr key={token}>
                <td>{token}</td>
                <td>{balance.cadence}</td>
                <td>{balance.evm}</td>
                <td>
                  <strong>{balance.total}</strong>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <button onClick={refetch}>Refresh</button>
    </div>
  )
}

// ─── Example 3: Cross-VM Swap ─────────────────────────────────────

export function CrossVMSwap() {
  const [amountIn, setAmountIn] = React.useState("")
  const [tokenIn, setTokenIn] = React.useState<"USDC" | "USDT">("USDC")
  const [tokenOut, setTokenOut] = React.useState<"FLOW" | "USDC">("FLOW")

  const { transfer, isLoading: isTransferring } = useFlowTransfer()
  const { batch, isLoading: isBatching } = useAtomicBatch()

  const handleSwap = async () => {
    const DEX_CONTRACT = "0x..." // EVM DEX contract

    // Step 1: Transfer tokens from Cadence to EVM
    await transfer({
      token: tokenIn,
      amount: amountIn,
      to: DEX_CONTRACT,
    })

    // Step 2: Execute swap on EVM DEX
    await batch([
      {
        contractAddress: DEX_CONTRACT,
        calldata: encodeSwap(tokenIn, tokenOut, amountIn),
      },
    ])
  }

  const isLoading = isTransferring || isBatching

  return (
    <div>
      <h3>Cross-VM Swap</h3>

      <div>
        <label>From:</label>
        <select value={tokenIn} onChange={(e) => setTokenIn(e.target.value as any)}>
          <option value="USDC">USDC</option>
          <option value="USDT">USDT</option>
        </select>
        <input
          type="text"
          placeholder="Amount"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
        />
      </div>

      <div>
        <label>To:</label>
        <select value={tokenOut} onChange={(e) => setTokenOut(e.target.value as any)}>
          <option value="FLOW">FLOW</option>
          <option value="USDC">USDC</option>
        </select>
      </div>

      <button onClick={handleSwap} disabled={isLoading}>
        {isLoading ? "Swapping..." : "Swap"}
      </button>
    </div>
  )
}

// ─── Example 4: Yield Farming Dashboard ──────────────────────────

export function YieldFarming() {
  const { user } = useFlowConnect()
  const { balance: stakedBalance } = useCrossVMBalance(user?.cadenceAddress, "FLOW")
  const { batch, isLoading } = useAtomicBatch()

  const handleStake = async (amount: string) => {
    const STAKING_CONTRACT = "0x..."

    await batch([
      {
        contractAddress: "0xFLOW",
        calldata: encodeApprove(STAKING_CONTRACT, amount),
      },
      {
        contractAddress: STAKING_CONTRACT,
        calldata: encodeStake(amount),
      },
    ])
  }

  const handleUnstake = async (amount: string) => {
    const STAKING_CONTRACT = "0x..."

    await batch([
      {
        contractAddress: STAKING_CONTRACT,
        calldata: encodeUnstake(amount),
      },
    ])
  }

  return (
    <div>
      <h3>Yield Farming</h3>
      <p>Staked: {stakedBalance?.total} FLOW</p>
      <p>APY: 12.5%</p>
      <p>Rewards: 0.5 FLOW</p>

      <button onClick={() => handleStake("10")} disabled={isLoading}>
        Stake 10 FLOW
      </button>
      <button onClick={() => handleUnstake("5")} disabled={isLoading}>
        Unstake 5 FLOW
      </button>
    </div>
  )
}

// ─── Helper Functions ─────────────────────────────────────────────

function encodeApprove(spender: string, amount: string): string {
  // ERC-20 approve(address,uint256)
  const selector = "095ea7b3"
  const spenderPadded = spender.slice(2).padStart(64, "0")
  const amountHex = BigInt(amount).toString(16).padStart(64, "0")
  return `0x${selector}${spenderPadded}${amountHex}`
}

function encodeDeposit(amount: string): string {
  // deposit(uint256)
  const selector = "b6b55f25"
  const amountHex = BigInt(amount).toString(16).padStart(64, "0")
  return `0x${selector}${amountHex}`
}

function encodeSwap(tokenIn: string, tokenOut: string, amount: string): string {
  // Simplified - actual implementation depends on DEX
  return "0x..."
}

function encodeStake(amount: string): string {
  return "0x..."
}

function encodeUnstake(amount: string): string {
  return "0x..."
}

function calculateTotalUSD(balances: any): number {
  // Mock price calculation
  const prices = { FLOW: 1.5, USDC: 1.0, USDT: 1.0 }
  let total = 0

  if (balances) {
    Object.entries(balances).forEach(([token, balance]: [string, any]) => {
      const price = prices[token as keyof typeof prices] || 0
      total += parseFloat(balance.total) * price
    })
  }

  return total
}

// ─── Complete DeFi App ────────────────────────────────────────────

export function DeFiApp() {
  return (
    <div style={{ padding: "20px" }}>
      <h1>DeFi Dashboard</h1>
      <Portfolio />
      <hr />
      <DeFiDeposit />
      <hr />
      <CrossVMSwap />
      <hr />
      <YieldFarming />
    </div>
  )
}
