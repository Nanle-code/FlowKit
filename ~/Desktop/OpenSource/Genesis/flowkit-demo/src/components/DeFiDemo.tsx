import { useState } from 'react'
import { useFlowConnect, useAtomicBatch } from 'flowkit/hooks'

export default function DeFiDemo() {
  const { isConnected } = useFlowConnect()
  const { batch, isLoading, error, data } = useAtomicBatch()
  const [amount, setAmount] = useState('')

  const handleDeposit = async () => {
    if (!amount) return

    try {
      // Mock EVM contract addresses
      const USDC_ADDRESS = '0x1234567890123456789012345678901234567890'
      const VAULT_ADDRESS = '0xAbCdEf1234567890123456789012345678901234'

      // Simulate approve + deposit calldata
      const approveCalldata = '0x095ea7b3...' // approve(address,uint256)
      const depositCalldata = '0xb6b55f25...' // deposit(uint256)

      await batch([
        { contractAddress: USDC_ADDRESS, calldata: approveCalldata },
        { contractAddress: VAULT_ADDRESS, calldata: depositCalldata }
      ])

      setAmount('')
    } catch (err) {
      console.error('Batch failed:', err)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        DeFi Integration Demo
      </h2>

      {!isConnected ? (
        <div className="alert alert-info">
          <p>Connect your wallet to try DeFi operations</p>
        </div>
      ) : (
        <>
          <div className="alert alert-info">
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>⚡ Atomic Batch Transactions</h3>
            <p>
              Execute multiple EVM calls with one wallet signature. If any call fails, all revert automatically.
            </p>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Deposit Amount (USDC)
            </label>
            <input
              className="input"
              type="text"
              placeholder="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <button
              className="button button-secondary"
              onClick={handleDeposit}
              disabled={isLoading || !amount}
              style={{ width: '100%' }}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  <span style={{ marginLeft: '8px' }}>Processing Batch...</span>
                </>
              ) : (
                'Approve + Deposit (Atomic)'
              )}
            </button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginTop: '16px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {data && (
            <div className="alert alert-success" style={{ marginTop: '16px' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>✅ Batch Successful!</h3>
              <div style={{ fontSize: '14px' }}>
                <p><strong>Transaction:</strong> <code>{data.txHash}</code></p>
                <p><strong>Calls Executed:</strong> {data.results.length}</p>
                <p>All calls succeeded atomically</p>
              </div>
            </div>
          )}

          <div className="comparison" style={{ marginTop: '20px' }}>
            <div className="comparison-item comparison-before">
              <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Without FlowKit</h3>
              <pre style={{ fontSize: '11px' }}>{`// Two separate transactions
// 1. Approve
await usdc.approve(vault, amount)
// Wait for confirmation...

// 2. Deposit
await vault.deposit(amount)
// Wait for confirmation...

// Problems:
// - Two signatures required
// - Two gas fees
// - Can fail between steps
// - Poor UX`}</pre>
            </div>

            <div className="comparison-item comparison-after">
              <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>With FlowKit</h3>
              <pre style={{ fontSize: '11px' }}>{`// One atomic transaction
await batch([
  { 
    contractAddress: USDC,
    calldata: encodeApprove(...)
  },
  { 
    contractAddress: VAULT,
    calldata: encodeDeposit(...)
  }
])

// Benefits:
// - One signature
// - One gas fee
// - Atomic (all or nothing)
// - Great UX`}</pre>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: '20px' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>💡 How Atomic Batching Works</h3>
            <p style={{ marginBottom: '8px' }}>
              FlowKit uses Cadence's transaction model to execute multiple EVM calls atomically:
            </p>
            <ol style={{ marginLeft: '20px', fontSize: '14px' }}>
              <li>User signs one Cadence transaction</li>
              <li>Transaction loops over EVM calls via COA</li>
              <li>Each iteration executes one EVM call</li>
              <li>If any call fails, entire transaction reverts</li>
              <li>All calls succeed or all fail together</li>
            </ol>
            <p style={{ marginTop: '12px', fontSize: '14px' }}>
              This is perfect for DeFi operations like approve + deposit, swap + stake, etc.
            </p>
          </div>

          <div className="card" style={{ marginTop: '20px', background: '#f7fafc' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Example: DeFi Deposit</h3>
            <pre style={{ fontSize: '12px' }}>{`import { batch } from 'flowkit'

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

// If deposit fails, approve automatically reverts
// No stuck approvals!`}</pre>
          </div>
        </>
      )}
    </div>
  )
}
