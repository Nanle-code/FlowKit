export default function ProblemSolution() {
  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        The Problem FlowKit Solves
      </h2>

      <div className="alert alert-error">
        <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>❌ Without FlowKit</h3>
        <p>Flow has two VMs (Cadence + EVM). Bridging between them requires:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Understanding both FCL and viem/ethers</li>
          <li>Manually detecting address types (8-byte vs 20-byte)</li>
          <li>Writing custom Cadence transactions for cross-VM calls</li>
          <li>Setting up Cadence-Owned Accounts (COAs) manually</li>
          <li>Handling gas sponsorship from scratch</li>
        </ul>
      </div>

      <div className="alert alert-success">
        <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>✅ With FlowKit</h3>
        <p>One unified API that handles everything automatically:</p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Automatic VM detection from address format</li>
          <li>Automatic routing (Cadence↔Cadence, EVM↔EVM, Cadence↔EVM)</li>
          <li>Atomic cross-VM bridging (no assets get stuck)</li>
          <li>Automatic COA creation and management</li>
          <li>Built-in gas sponsorship support</li>
        </ul>
      </div>

      <div className="comparison">
        <div className="comparison-item comparison-before">
          <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Before FlowKit</h3>
          <pre style={{ fontSize: '12px' }}>{`// Cadence → EVM transfer (manual)
// 1. Detect address type
const isEVM = address.length === 42

// 2. Get COA
const coa = await account.borrow(...)

// 3. Write Cadence transaction
const tx = \`
  import EVM from 0xEVM
  import FlowToken from 0xFlowToken
  // ... 50+ lines of Cadence
\`

// 4. Execute transaction
await fcl.mutate({ cadence: tx, ... })

// 5. Handle errors at each step
// ~100 lines of code`}</pre>
        </div>

        <div className="comparison-item comparison-after">
          <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>With FlowKit</h3>
          <pre style={{ fontSize: '12px' }}>{`// Cadence → EVM transfer (FlowKit)
import { transfer } from 'flowkit'

await transfer({
  token: 'USDC',
  amount: '100',
  to: '0xAbCd...' // EVM address
})

// That's it! FlowKit handles:
// - VM detection
// - COA management
// - Cross-VM bridging
// - Error handling
// 1 line of code`}</pre>
        </div>
      </div>

      <div className="stats">
        <div className="stat-card">
          <div className="stat-value">100x</div>
          <div className="stat-label">Less Code</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">1 API</div>
          <div className="stat-label">Unified Interface</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">4 Routes</div>
          <div className="stat-label">Auto-Detected</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">⚛️ Atomic</div>
          <div className="stat-label">Cross-VM Transfers</div>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: '20px' }}>
        <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎯 Key Innovation</h3>
        <p>
          FlowKit automatically detects VM from address format:
        </p>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li><code>0x1d007d755531709b</code> (8 bytes) → Cadence VM</li>
          <li><code>0xAbCd1234567890123456789012345678901234567890</code> (20 bytes) → EVM</li>
        </ul>
        <p style={{ marginTop: '8px' }}>
          This powers the automatic routing - you never need to specify the VM!
        </p>
      </div>
    </div>
  )
}
