import { useState } from 'react'
import { useFlowConnect, useFlowTransfer, useCrossVMBalance } from 'flowkit/hooks'

export default function TokenTransferDemo() {
  const { user, isConnected } = useFlowConnect()
  const { transfer, isLoading, error, data } = useFlowTransfer()
  const [token, setToken] = useState<'FLOW' | 'USDC' | 'USDT'>('USDC')
  const [amount, setAmount] = useState('')
  const [recipient, setRecipient] = useState('')

  const { balance: flowBalance } = useCrossVMBalance(user?.cadenceAddress || null, 'FLOW')
  const { balance: usdcBalance } = useCrossVMBalance(user?.cadenceAddress || null, 'USDC')

  const handleTransfer = async () => {
    if (!amount || !recipient) return

    try {
      await transfer({ token, amount, to: recipient })
      setAmount('')
      setRecipient('')
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  const detectVM = (address: string) => {
    if (!address) return null
    if (address.length <= 18) return 'cadence'
    if (address.length === 42) return 'evm'
    return 'unknown'
  }

  const recipientVM = detectVM(recipient)

  return (
    <div>
      <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
        Token Transfer Demo
      </h2>

      {!isConnected ? (
        <div className="alert alert-info">
          <p>Connect your wallet to try token transfers</p>
        </div>
      ) : (
        <>
          <div className="alert alert-info">
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Your Balances</h3>
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <strong>FLOW:</strong> {flowBalance?.total || '0'} FLOW
                <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                  Cadence: {flowBalance?.cadence || '0'} | EVM: {flowBalance?.evm || '0'}
                </div>
              </div>
              <div>
                <strong>USDC:</strong> {usdcBalance?.total || '0'} USDC
                <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                  Cadence: {usdcBalance?.cadence || '0'} | EVM: {usdcBalance?.evm || '0'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Select Token
            </label>
            <select 
              className="select"
              value={token}
              onChange={(e) => setToken(e.target.value as any)}
            >
              <option value="FLOW">FLOW</option>
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
            </select>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Amount
            </label>
            <input
              className="input"
              type="text"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Recipient Address
            </label>
            <input
              className="input"
              type="text"
              placeholder="0x1d007d... (Cadence) or 0xAbCd... (EVM)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />

            {recipientVM && (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', color: '#4a5568' }}>
                  Detected VM: 
                </span>
                {recipientVM === 'cadence' && <span className="badge badge-cadence">Cadence</span>}
                {recipientVM === 'evm' && <span className="badge badge-evm">EVM</span>}
                {recipientVM === 'unknown' && <span className="badge">Unknown</span>}
                
                {user?.cadenceAddress && recipientVM !== 'unknown' && (
                  <span style={{ fontSize: '14px', color: '#4a5568', marginLeft: '8px' }}>
                    Route: 
                    {recipientVM === 'cadence' && <span className="badge badge-cadence">Cadence → Cadence</span>}
                    {recipientVM === 'evm' && <span className="badge badge-cross-vm">Cadence → EVM (Cross-VM Bridge)</span>}
                  </span>
                )}
              </div>
            )}

            <button
              className="button"
              onClick={handleTransfer}
              disabled={isLoading || !amount || !recipient}
              style={{ width: '100%' }}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  <span style={{ marginLeft: '8px' }}>Transferring...</span>
                </>
              ) : (
                `Transfer ${token}`
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
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>✅ Transfer Successful!</h3>
              <div style={{ fontSize: '14px' }}>
                <p><strong>Transaction:</strong> <code>{data.txHash}</code></p>
                <p><strong>Route:</strong> <span className="badge badge-cross-vm">{data.route}</span></p>
                <p><strong>Token:</strong> {data.token}</p>
                <a 
                  href={data.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#667eea', textDecoration: 'underline' }}
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          )}

          <div className="alert alert-info" style={{ marginTop: '20px' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>💡 How It Works</h3>
            <p style={{ marginBottom: '8px' }}>
              FlowKit automatically detects the recipient's VM and routes the transfer:
            </p>
            <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
              <li><strong>Cadence → Cadence:</strong> FungibleToken transaction</li>
              <li><strong>Cadence → EVM:</strong> Cross-VM bridge via COA (atomic)</li>
              <li><strong>EVM → Cadence:</strong> Reverse bridge (atomic)</li>
              <li><strong>EVM → EVM:</strong> Standard ERC-20 transfer</li>
            </ul>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              All cross-VM transfers are <strong>atomic</strong> - if any step fails, the entire transaction reverts.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
