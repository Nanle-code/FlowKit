import * as fcl from "@onflow/fcl"
import type { CadenceAddress } from "./types"

/**
 * sponsor.ts — Gas sponsorship wrapper.
 *
 * Flow natively supports fee delegation: a "payer" account covers
 * transaction fees so users don't need FLOW to interact.
 */

export interface SponsoredTxOptions {
  cadence: string
  args?: (arg: unknown, t: unknown) => unknown[]
  sponsor: CadenceAddress
  limit?: number
}

export interface SponsoredTxResult {
  txHash: string
  feeSponsored: boolean
}

/**
 * Execute a sponsored transaction. The user pays ZERO gas fees.
 *
 * @example
 * const result = await sponsor({
 *   cadence: MY_TRANSACTION,
 *   args: (arg, t) => [arg('hello', t.String)],
 *   sponsor: '0xSponsorAddress',
 * })
 */
export async function sponsor(options: SponsoredTxOptions): Promise<SponsoredTxResult> {
  const { cadence, args, sponsor: sponsorAddress, limit = 999 } = options

  const sponsorAuthz = fcl.authz

  const txHash = await fcl.mutate({
    cadence,
    args: args ?? (() => []),
    proposer: fcl.authz,
    authorizations: [fcl.authz],
    payer: sponsorAuthz,
    limit,
  })

  return { txHash, feeSponsored: true }
}

const GET_FLOW_BALANCE_SCRIPT = `
import FungibleToken from 0xFungibleToken
import FlowToken from 0xFlowToken

access(all) fun main(address: Address): UFix64 {
  let account = getAccount(address)
  let vaultRef = account.capabilities.borrow<&FlowToken.Vault>(/public/flowTokenReceiver)
  return vaultRef?.balance ?? 0.0
}`

export async function needsSponsorship(address: CadenceAddress): Promise<boolean> {
  try {
    const balance = await fcl.query({
      cadence: GET_FLOW_BALANCE_SCRIPT,
      args: (arg: (v: string, t: unknown) => unknown, t: { Address: unknown }) => [arg(address, t.Address)],
    })
    return parseFloat(balance as string) < 0.001
  } catch {
    return true
  }
}
