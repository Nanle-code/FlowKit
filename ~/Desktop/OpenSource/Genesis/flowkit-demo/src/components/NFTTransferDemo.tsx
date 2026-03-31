import { useState } from 'react'
import { useFlowConnect, useNFTTransfer, useNFTBalance } from 'flowkit/hooks'

export default function NFTTransferDemo() {
  const { user, isConnected } = useFlowConnect()
  const { transfer, isLoading, error, data } = useNFTTransfer()
  const [collection, setCollection] = useState<'TopShot' | 'Flovatar'>('TopShot')
  const [tokenId, setTokenId] = useState('')
  const [recipient, setRecipient] = useState('')

  const { balance: topShotBalance } = useNFTBalance(
    user?.cadenceAddress || null,
    'TopShot'
  )

  const handleTransfer = async () => {
    if (!tokenId || !recipient) return

    try {
      await transfer({ collection, tokenId, to: recipient })
      setTokenId('')
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
        NFT Transfer Demo
      </h2>

      {!isConnected ? (
        <div className="alert alert-info">
          <p>Connect your wallet to try NFT transfers</p>
        </div>
      ) : (
        <>
          <div className="alert alert-info">
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Your NFTs</h3>
            <div>
              <strong>NBA Top Shot:</strong> {topShotBalance?.count || 0} moments
              {topShotBalance && topShotBalance.count > 0 && (
                <div style={{ fontSize: '12px', color: '#4a5568', marginTop: '4px' }}>
                  Token IDs: {topShotBalance.tokenIds.slice(0, 5).join(', ')}
                  {topShotBalance.tokenIds.length > 5 && '...'}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Select Collection
            </label>
            <select 
              className="select"
              value={collection}
              onChange={(e) => setCollection(e.target.value as any)}
            >
              <option value="TopShot">NBA Top Shot</option>
              <option value="Flovatar">Flovatar</option>
            </select>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
              Token ID
            </label>
            <input
              className="input"
              type="text"
              placeholder="12345"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
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
              disabled={isLoading || !tokenId || !recipient}
              style={{ width: '100%' }}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  <span style={{ marginLeft: '8px' }}>Transferring NFT...</span>
                </>
              ) : (
                `Transfer ${collection} NFT`
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
              <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>✅ NFT Transfer Successful!</h3>
              <div style={{ fontSize: '14px' }}>
                <p><strong>Transaction:</strong> <code>{data.txHash}</code></p>
                <p><strong>Route:</strong> <span className="badge badge-cross-vm">{data.route}</span></p>
                <p><strong>Collection:</strong> {data.collection}</p>
                <p><strong>Token ID:</strong> {data.tokenId}</p>
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
            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>🎨 NFT Cross-VM Bridge</h3>
            <p style={{ marginBottom: '8px' }}>
              FlowKit enables seamless NFT transfers between Cadence and EVM:
            </p>
            <ul style={{ marginLeft: '20px', fontSize: '14px' }}>
              <li><strong>Cadence → Cadence:</strong> NonFungibleToken.Collection transfer</li>
              <li><strong>Cadence → EVM:</strong> Bridge to ERC-721 (atomic)</li>
              <li><strong>EVM → Cadence:</strong> Bridge from ERC-721 (atomic)</li>
              <li><strong>EVM → EVM:</strong> Standard ERC-721 transfer</li>
            </ul>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              All cross-VM NFT transfers are <strong>atomic</strong> - no NFTs get stuck in the bridge!
            </p>
          </div>

          <div className="card" style={{ marginTop: '20px', background: '#f7fafc' }}>
            <h3 style={{ fontWeight: 'bold', marginBottom: '12px' }}>Example: Cross-VM NFT Transfer</h3>
            <pre style={{ fontSize: '12px' }}>{`import { transferNFT } from 'flowkit'

// Transfer NBA Top Shot moment to EVM
await transferNFT({
  collection: 'TopShot',
  tokenId: '12345',
  to: '0xAbCd...' // EVM address
})

// FlowKit automatically:
// 1. Withdraws NFT from Cadence collection
// 2. Bridges to EVM via FlowEVMBridge
// 3. Transfers ERC-721 to recipient
// All in one atomic transaction!`}</pre>
          </div>
        </>
      )}
    </div>
  )
}
