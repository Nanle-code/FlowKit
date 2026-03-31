import { transfer } from '../transfer'

jest.mock('@onflow/fcl', () => ({
  mutate: jest.fn().mockResolvedValue('0xmocktxhash'),
}))

jest.mock('../client', () => ({
  getExplorerUrl: (hash: string) => `https://testnet.flowscan.io/tx/${hash}`,
  getConfig: () => ({ network: 'testnet' }),
  getNetworkConfig: () => ({ explorerBase: 'https://testnet.flowscan.io/tx' }),
}))

describe('transfer', () => {
  it('throws for unsupported tokens', async () => {
    await expect(
      transfer({ token: 'UNSUPPORTED', amount: '1.0', to: '0x1d007d755531709b' })
    ).rejects.toThrow('Unknown token "UNSUPPORTED"')
  })

  it('routes Cadence → Cadence correctly', async () => {
    const result = await transfer({
      token: 'FLOW',
      amount: '1.0',
      to: '0x1d007d755531709b',
    })
    expect(result.vm).toBe('cadence')
    expect(result.txHash).toBe('0xmocktxhash')
    expect(result.explorerUrl).toContain('0xmocktxhash')
  })

  it('routes Cadence → EVM as cross-vm', async () => {
    const result = await transfer({
      token: 'FLOW',
      amount: '1.0',
      to: '0xAbCd1234567890123456789012345678901234Ab',
    })
    expect(result.vm).toBe('cross-vm')
  })
})
