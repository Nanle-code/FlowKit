import { useFlowConnect } from 'flowkit/hooks'

export default function Header() {
  const { connect, disconnect, user, isConnected } = useFlowConnect()

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            FlowKit Demo
          </h1>
          <p style={{ color: '#718096' }}>
            Cross-VM Made Simple - One API for Flow's Dual-VM Future
          </p>
        </div>
        
        <div>
          {!isConnected ? (
            <button 
              className="button"
              onClick={() => connect({ withEVM: true })}
            >
              Connect Wallet
            </button>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '8px' }}>
                <span className="badge badge-cadence">Cadence</span>
                <code style={{ fontSize: '12px' }}>{user?.cadenceAddress}</code>
              </div>
              {user?.evmAddress && (
                <div style={{ marginBottom: '8px' }}>
                  <span className="badge badge-evm">EVM</span>
                  <code style={{ fontSize: '12px' }}>{user.evmAddress}</code>
                </div>
              )}
              <button 
                className="button button-danger"
                onClick={disconnect}
                style={{ fontSize: '14px', padding: '8px 16px' }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
