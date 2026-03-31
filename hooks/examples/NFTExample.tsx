import React from 'react'
import { 
  FlowKitProvider, 
  useFlowConnect,
  useNFTTransfer,
  useNFTMetadata,
  useNFTBalance,
  useNFTCollection,
} from 'flowkit/hooks'

/**
 * NFT Example - Cross-VM NFT transfers and metadata
 * 
 * Demonstrates:
 * - NFT transfers (Cadence ↔ EVM)
 * - Metadata fetching
 * - NFT balance queries
 * - Collection display
 */

// ─── NFT Card Component ──────────────────────────────────────────

interface NFTCardProps {
  tokenId: string
  name: string
  description: string
  image: string
  collection: string
  onTransfer?: (tokenId: string) => void
}

function NFTCard({ tokenId, name, description, image, onTransfer }: NFTCardProps) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '300px',
    }}>
      <img 
        src={image} 
        alt={name}
        style={{ width: '100%', borderRadius: '4px' }}
      />
      <h3>{name}</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>{description}</p>
      <p style={{ fontSize: '12px', color: '#999' }}>Token ID: {tokenId}</p>
      {onTransfer && (
        <button onClick={() => onTransfer(tokenId)}>
          Transfer
        </button>
      )}
    </div>
  )
}

// ─── Single NFT Transfer ─────────────────────────────────────────

function SingleNFTTransfer() {
  const { user } = useFlowConnect()
  const { transfer, isLoading, isSuccess, error } = useNFTTransfer()
  const [recipient, setRecipient] = React.useState('')

  const handleTransfer = async () => {
    if (!recipient) return

    try {
      await transfer({
        collection: 'TopShot',
        tokenId: '12345',
        to: recipient,
      })
      alert('NFT transferred successfully!')
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  return (
    <div>
      <h2>Transfer NBA Top Shot Moment</h2>
      
      <input
        type="text"
        placeholder="Recipient address (Cadence or EVM)"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
      />

      <button 
        onClick={handleTransfer}
        disabled={isLoading || !recipient}
      >
        {isLoading ? 'Transferring...' : 'Transfer NFT'}
      </button>

      {isSuccess && (
        <p style={{ color: 'green' }}>✓ Transfer successful!</p>
      )}

      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}
    </div>
  )
}

// ─── NFT Metadata Display ────────────────────────────────────────

function NFTMetadataDisplay() {
  const { user } = useFlowConnect()
  const [tokenId, setTokenId] = React.useState('12345')

  const { metadata, isLoading, error, refetch } = useNFTMetadata(
    user?.cadenceAddress || null,
    'TopShot',
    tokenId
  )

  return (
    <div>
      <h2>View NFT Metadata</h2>

      <input
        type="text"
        placeholder="Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        style={{ padding: '8px', marginRight: '8px' }}
      />

      <button onClick={refetch}>
        Fetch Metadata
      </button>

      {isLoading && <p>Loading metadata...</p>}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {metadata && (
        <NFTCard
          tokenId={metadata.tokenId}
          name={metadata.name}
          description={metadata.description}
          image={metadata.image}
          collection={metadata.collection}
        />
      )}
    </div>
  )
}

// ─── NFT Balance Display ─────────────────────────────────────────

function NFTBalanceDisplay() {
  const { user } = useFlowConnect()

  const { balance, isLoading, error } = useNFTBalance(
    user?.cadenceAddress || null,
    'TopShot',
    { refetchInterval: 30000 } // Refresh every 30 seconds
  )

  if (!user) {
    return <p>Connect wallet to view your NFTs</p>
  }

  return (
    <div>
      <h2>Your NBA Top Shot Moments</h2>

      {isLoading && <p>Loading...</p>}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      {balance && (
        <div>
          <p>You own {balance.count} moments</p>
          <ul>
            {balance.tokenIds.map(id => (
              <li key={id}>Moment #{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Full NFT Collection Gallery ─────────────────────────────────

function NFTCollectionGallery() {
  const { user } = useFlowConnect()
  const { transfer } = useNFTTransfer()
  const [transferTo, setTransferTo] = React.useState('')

  const { nfts, count, isLoading, error, refetch } = useNFTCollection(
    user?.cadenceAddress || null,
    'Flovatar',
    { maxNFTs: 12 } // Limit to 12 NFTs
  )

  const handleTransfer = async (tokenId: string) => {
    if (!transferTo) {
      alert('Please enter a recipient address')
      return
    }

    try {
      await transfer({
        collection: 'Flovatar',
        tokenId,
        to: transferTo,
      })
      alert('NFT transferred!')
      refetch() // Refresh collection
    } catch (err) {
      console.error('Transfer failed:', err)
    }
  }

  if (!user) {
    return <p>Connect wallet to view your Flovatars</p>
  }

  return (
    <div>
      <h2>Your Flovatar Collection</h2>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Transfer to address..."
          value={transferTo}
          onChange={(e) => setTransferTo(e.target.value)}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      {isLoading && <p>Loading collection...</p>}

      {error && <p style={{ color: 'red' }}>Error: {error}</p>}

      <p>Showing {count} Flovatars</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '16px',
      }}>
        {nfts.map(nft => (
          <NFTCard
            key={nft.tokenId}
            {...nft}
            onTransfer={handleTransfer}
          />
        ))}
      </div>

      <button onClick={refetch} style={{ marginTop: '16px' }}>
        Refresh Collection
      </button>
    </div>
  )
}

// ─── Cross-VM NFT Bridge ─────────────────────────────────────────

function CrossVMNFTBridge() {
  const { user } = useFlowConnect()
  const { transfer, isLoading, isSuccess, error } = useNFTTransfer()

  const [collection, setCollection] = React.useState('TopShot')
  const [tokenId, setTokenId] = React.useState('')
  const [recipient, setRecipient] = React.useState('')

  const handleBridge = async () => {
    if (!tokenId || !recipient) return

    try {
      const result = await transfer({
        collection,
        tokenId,
        to: recipient,
      })

      console.log('Bridge result:', result)
      alert(`NFT bridged via ${result.route}!`)
    } catch (err) {
      console.error('Bridge failed:', err)
    }
  }

  return (
    <div>
      <h2>Cross-VM NFT Bridge</h2>
      <p>Transfer NFTs between Cadence and EVM automatically</p>

      <div style={{ marginBottom: '16px' }}>
        <label>
          Collection:
          <select 
            value={collection} 
            onChange={(e) => setCollection(e.target.value)}
            style={{ marginLeft: '8px', padding: '4px' }}
          >
            <option value="TopShot">NBA Top Shot</option>
            <option value="Flovatar">Flovatar</option>
          </select>
        </label>
      </div>

      <input
        type="text"
        placeholder="Token ID"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
      />

      <input
        type="text"
        placeholder="Recipient (Cadence or EVM address)"
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
      />

      <button 
        onClick={handleBridge}
        disabled={isLoading || !tokenId || !recipient}
      >
        {isLoading ? 'Bridging...' : 'Bridge NFT'}
      </button>

      {isSuccess && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#d4edda',
          borderRadius: '4px' 
        }}>
          <p style={{ color: '#155724', margin: 0 }}>
            ✓ NFT successfully bridged!
          </p>
        </div>
      )}

      {error && (
        <div style={{ 
          marginTop: '16px', 
          padding: '12px', 
          backgroundColor: '#f8d7da',
          borderRadius: '4px' 
        }}>
          <p style={{ color: '#721c24', margin: 0 }}>
            Error: {error}
          </p>
        </div>
      )}

      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '4px' 
      }}>
        <h3>How it works:</h3>
        <ul>
          <li>Cadence address (8 bytes) → Stays in Cadence</li>
          <li>EVM address (20 bytes) → Bridges to EVM automatically</li>
          <li>All bridging is atomic - no manual steps!</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────

function NFTApp() {
  const { connect, disconnect, user, isConnected } = useFlowConnect()

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>FlowKit NFT Example</h1>

      {!isConnected ? (
        <div>
          <p>Connect your wallet to manage NFTs across Cadence and EVM</p>
          <button onClick={() => connect({ withEVM: true })}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <div style={{ 
            marginBottom: '24px', 
            padding: '16px', 
            backgroundColor: '#f8f9fa',
            borderRadius: '4px' 
          }}>
            <p><strong>Cadence:</strong> {user?.cadenceAddress}</p>
            <p><strong>EVM:</strong> {user?.evmAddress || 'Not created'}</p>
            <button onClick={disconnect}>Disconnect</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <CrossVMNFTBridge />
            <hr />
            <NFTCollectionGallery />
            <hr />
            <NFTBalanceDisplay />
            <hr />
            <NFTMetadataDisplay />
            <hr />
            <SingleNFTTransfer />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Export with Provider ────────────────────────────────────────

export default function NFTExampleApp() {
  return (
    <FlowKitProvider network="testnet" appName="NFT Example">
      <NFTApp />
    </FlowKitProvider>
  )
}
