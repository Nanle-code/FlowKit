import type { AnyAddress, VM } from "./types"

/**
 * detect.ts — Determines which VM an address belongs to.
 *
 * Flow Cadence addresses: 8 bytes (16 hex chars), e.g. 0x1d007d755531709b
 * EVM addresses: 20 bytes (40 hex chars), e.g. 0xAbCd1234...
 *
 * This is the heart of FlowKit's "one API call" routing promise.
 */

const CADENCE_ADDR_REGEX = /^0x[0-9a-fA-F]{1,16}$/
const EVM_ADDR_REGEX = /^0x[0-9a-fA-F]{40}$/

export function detectVM(address: AnyAddress): VM {
  if (!address || typeof address !== "string") return "unknown"
  const clean = address.trim()
  if (EVM_ADDR_REGEX.test(clean)) return "evm"
  if (CADENCE_ADDR_REGEX.test(clean)) return "cadence"
  return "unknown"
}

export function isCadenceAddress(address: AnyAddress): boolean {
  return detectVM(address) === "cadence"
}

export function isEVMAddress(address: AnyAddress): boolean {
  return detectVM(address) === "evm"
}

/**
 * Determines the routing strategy for a transfer.
 * Returns the path: cadence→cadence, evm→evm, or cross-vm.
 */
export function detectTransferRoute(
  from: AnyAddress,
  to: AnyAddress
): "cadence" | "evm" | "cross-vm" {
  const fromVM = detectVM(from)
  const toVM = detectVM(to)

  if (fromVM === "cadence" && toVM === "cadence") return "cadence"
  if (fromVM === "evm" && toVM === "evm") return "evm"
  return "cross-vm"
}
