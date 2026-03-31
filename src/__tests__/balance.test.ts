import { getCadenceBalance, getCOABalance, getEVMBalance } from '../balance'
import { init } from '../client'

// Mock @onflow/fcl
jest.mock('@onflow/fcl', () => ({
  query: jest.fn(),
  config: jest.fn().mockReturnValue({
    put: jest.fn(),
  }),
}))

import * as fcl from '@onflow/fcl'
const mockFcl = fcl as jest.Mocked<typeof fcl>

describe('balance queries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Initialize FlowKit before each test
    init({ network: 'testnet' })
  })

  it('getCadenceBalance returns string balance', async () => {
    (mockFcl.query as jest.Mock).mockResolvedValue('10.50000000')
    const result = await getCadenceBalance('0x1d007d755531709b')
    expect(result).toBe('10.50000000')
  })

  it('getCadenceBalance returns 0 on error', async () => {
    (mockFcl.query as jest.Mock).mockRejectedValue(new Error('network error'))
    const result = await getCadenceBalance('0x1d007d755531709b')
    expect(result).toBe('0.00000000')
  })

  it('getCOABalance returns 0 when no COA exists', async () => {
    (mockFcl.query as jest.Mock).mockResolvedValue(null)
    const result = await getCOABalance('0x1d007d755531709b')
    expect(result).toBe('0.00000000')
  })
})
