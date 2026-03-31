import { detectVM, isCadenceAddress, isEVMAddress, detectTransferRoute } from '../detect'

describe('detectVM', () => {
  it('identifies a Cadence address (8-byte hex)', () => {
    expect(detectVM('0x1d007d755531709b')).toBe('cadence')
  })

  it('identifies a short Cadence address', () => {
    expect(detectVM('0xf8d6e0586b0a20c7')).toBe('cadence')
  })

  it('identifies an EVM address (20-byte hex)', () => {
    expect(detectVM('0xAbCd1234567890123456789012345678901234Ab')).toBe('evm')
  })

  it('identifies a lowercase EVM address', () => {
    expect(detectVM('0xabcd1234567890123456789012345678901234ab')).toBe('evm')
  })

  it('returns unknown for invalid input', () => {
    expect(detectVM('')).toBe('unknown')
    expect(detectVM('notanaddress')).toBe('unknown')
    expect(detectVM('0x')).toBe('unknown')
  })
})

describe('isCadenceAddress / isEVMAddress', () => {
  it('correctly identifies Cadence', () => {
    expect(isCadenceAddress('0x1d007d755531709b')).toBe(true)
    expect(isCadenceAddress('0xAbCd1234567890123456789012345678901234Ab')).toBe(false)
  })

  it('correctly identifies EVM', () => {
    expect(isEVMAddress('0xAbCd1234567890123456789012345678901234Ab')).toBe(true)
    expect(isEVMAddress('0x1d007d755531709b')).toBe(false)
  })
})

describe('detectTransferRoute', () => {
  const CADENCE = '0x1d007d755531709b'
  const EVM = '0xAbCd1234567890123456789012345678901234Ab'

  it('routes Cadence → Cadence as cadence', () => {
    expect(detectTransferRoute(CADENCE, CADENCE)).toBe('cadence')
  })

  it('routes EVM → EVM as evm', () => {
    expect(detectTransferRoute(EVM, EVM)).toBe('evm')
  })

  it('routes Cadence → EVM as cross-vm', () => {
    expect(detectTransferRoute(CADENCE, EVM)).toBe('cross-vm')
  })

  it('routes EVM → Cadence as cross-vm', () => {
    expect(detectTransferRoute(EVM, CADENCE)).toBe('cross-vm')
  })
})
