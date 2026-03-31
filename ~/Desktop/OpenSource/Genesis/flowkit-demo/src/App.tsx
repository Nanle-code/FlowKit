import { useState } from 'react'
import { FlowKitProvider } from 'flowkit/hooks'
import Header from './components/Header'
import ProblemSolution from './components/ProblemSolution'
import TokenTransferDemo from './components/TokenTransferDemo'
import NFTTransferDemo from './components/NFTTransferDemo'
import DeFiDemo from './components/DeFiDemo'
import ComparisonDemo from './components/ComparisonDemo'

function App() {
  const [activeTab, setActiveTab] = useState<'problem' | 'tokens' | 'nfts' | 'defi' | 'comparison'>('problem')

  return (
    <FlowKitProvider network="testnet" appName="FlowKit Demo">
      <div className="container">
        <Header />
        
        <div className="card">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'problem' ? 'active' : ''}`}
              onClick={() => setActiveTab('problem')}
            >
              The Problem
            </button>
            <button 
              className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
              onClick={() => setActiveTab('tokens')}
            >
              Token Transfers
            </button>
            <button 
              className={`tab ${activeTab === 'nfts' ? 'active' : ''}`}
              onClick={() => setActiveTab('nfts')}
            >
              NFT Transfers
            </button>
            <button 
              className={`tab ${activeTab === 'defi' ? 'active' : ''}`}
              onClick={() => setActiveTab('defi')}
            >
              DeFi Integration
            </button>
            <button 
              className={`tab ${activeTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setActiveTab('comparison')}
            >
              Before vs After
            </button>
          </div>

          {activeTab === 'problem' && <ProblemSolution />}
          {activeTab === 'tokens' && <TokenTransferDemo />}
          {activeTab === 'nfts' && <NFTTransferDemo />}
          {activeTab === 'defi' && <DeFiDemo />}
          {activeTab === 'comparison' && <ComparisonDemo />}
        </div>
      </div>
    </FlowKitProvider>
  )
}

export default App
