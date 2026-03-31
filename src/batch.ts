import * as fcl from "@onflow/fcl"
import type { BatchCall, BatchResult } from "./types"
import { getExplorerUrl } from "./client"

/**
 * batch.ts — Execute multiple EVM transactions in one Cadence transaction.
 *
 * This is one of Flow's most powerful features: atomic multi-call.
 * A user signs ONCE in their wallet, and ALL calls execute atomically.
 * If any call fails, ALL revert. No partial state.
 *
 * @example
 * await batch([
 *   { contractAddress: USDC_EVM, calldata: encodeApprove(VAULT, amount) },
 *   { contractAddress: VAULT_EVM, calldata: encodeDeposit(amount) },
 * ])
 */

const BATCH_EVM_TX = `
import EVM from 0xEVM

transaction(
  contractAddresses: [String],
  calldatas: [String],
  values: [UFix64],
  gasLimit: UInt64
) {
  let coa: auth(EVM.Call) &EVM.CadenceOwnedAccount

  prepare(signer: auth(BorrowValue) &Account) {
    self.coa = signer.storage.borrow<auth(EVM.Call) &EVM.CadenceOwnedAccount>(from: /storage/evm)
      ?? panic("No COA — call connect() with withEVM: true first.")
  }

  execute {
    var i = 0
    while i < contractAddresses.length {
      let toAddr = EVM.addressFromString(contractAddresses[i])
      let calldata = contractAddresses[i].decodeHex()
      let balance = EVM.Balance(attoflow: 0)
      balance.setFLOW(flow: values[i])
      
      let result = self.coa.call(
        to: toAddr,
        data: calldata,
        gasLimit: gasLimit,
        value: balance
      )
      
      assert(
        result.status == EVM.Status.successful,
        message: "Batch call ".concat(i.toString()).concat(" failed")
      )
      i = i + 1
    }
  }
}`

export async function batch(
  calls: BatchCall[],
  gasLimit = 300000
): Promise<BatchResult> {
  if (calls.length === 0) throw new Error("FlowKit batch: at least one call required")
  if (calls.length > 10) throw new Error("FlowKit batch: max 10 calls per batch (MVP limit)")

  const contractAddresses = calls.map((c) => c.contractAddress)
  const calldatas = calls.map((c) => c.calldata ?? "0x")
  const values = calls.map((c) => parseFloat(c.value ?? "0.0").toFixed(8))

  const txHash = await fcl.mutate({
    cadence: BATCH_EVM_TX,
    args: (arg: (v: unknown, t: unknown) => unknown, t: { Array: (vals: unknown[], type: unknown) => unknown; String: unknown; UFix64: unknown; UInt64: unknown }) => [
      arg(contractAddresses, t.Array(contractAddresses.map(() => t.String), t.String)),
      arg(calldatas, t.Array(calldatas.map(() => t.String), t.String)),
      arg(values, t.Array(values.map(() => t.UFix64), t.UFix64)),
      arg(String(gasLimit), t.UInt64),
    ],
    limit: 9999,
  })

  return {
    txHash,
    results: calls.map(() => ({ success: true })),
  }
}

/**
 * Convenience: batch a sequence of raw Cadence transactions.
 */
export async function batchCadence(
  transactions: Array<{ cadence: string; args?: unknown[] }>
): Promise<{ txHash: string; explorerUrl: string }> {
  if (transactions.length !== 1) {
    throw new Error("FlowKit MVP: Cadence batch supports single composite transaction.")
  }

  const txHash = await fcl.mutate({
    cadence: transactions[0].cadence,
    args: () => transactions[0].args ?? [],
    limit: 9999,
  })

  return { txHash, explorerUrl: getExplorerUrl(txHash) }
}
