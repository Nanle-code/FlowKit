import * as fcl from "@onflow/fcl"
import type {
  FlowKitConfig,
  FlowKitUser,
  ConnectOptions,
  CadenceAddress,
  EVMAddress,
} from "./types"

// ─── Network Presets ──────────────────────────────────────────────

const NETWORK_CONFIGS = {
  mainnet: {
    accessNode: "https://rest-mainnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/authn",
    evmGateway: "https://mainnet.evm.nodes.onflow.org",
    chainId: "0x747",
    explorerBase: "https://flowscan.io/tx",
  },
  testnet: {
    accessNode: "https://rest-testnet.onflow.org",
    discoveryWallet: "https://fcl-discovery.onflow.org/testnet/authn",
    evmGateway: "https://testnet.evm.nodes.onflow.org",
    chainId: "0x221",
    explorerBase: "https://testnet.flowscan.io/tx",
  },
  emulator: {
    accessNode: "http://localhost:8888",
    discoveryWallet: "http://localhost:8701/fcl/authn",
    evmGateway: "http://localhost:8545",
    chainId: "0x1",
    explorerBase: "http://localhost:8701/tx",
  },
} as const

let _config: FlowKitConfig | null = null

/**
 * Initialize FlowKit. Call once at app startup.
 *
 * @example
 * import { init } from 'flowkit'
 * init({ network: 'testnet', appName: 'My App' })
 */
export function init(config: FlowKitConfig & { appName?: string }): void {
  _config = config
  const net = NETWORK_CONFIGS[config.network]

  fcl.config({
    "app.detail.title": config.appName ?? "FlowKit App",
    "accessNode.api": config.accessNode ?? net.accessNode,
    "discovery.wallet": net.discoveryWallet,
    "flow.network": config.network,
  })
}

export function getConfig(): FlowKitConfig {
  if (!_config) throw new Error("FlowKit not initialized. Call init() first.")
  return _config
}

export function getNetworkConfig() {
  const cfg = getConfig()
  return NETWORK_CONFIGS[cfg.network]
}

// ─── COA Creation Cadence Script ──────────────────────────────────

const CREATE_COA_TX = `
import EVM from 0xEVM

transaction(amount: UFix64) {
  prepare(signer: auth(Storage, Capabilities) &Account) {
    if signer.storage.type(at: /storage/evm) != nil {
      return
    }
    let coa <- EVM.createCadenceOwnedAccount()
    signer.storage.save(<-coa, to: /storage/evm)
    let cap = signer.capabilities.storage.issue<&EVM.CadenceOwnedAccount>(/storage/evm)
    signer.capabilities.publish(cap, at: /public/evm)
  }
}`

// ─── Auth ─────────────────────────────────────────────────────────

/**
 * Connect user wallet. Returns a unified user object with both
 * Cadence and EVM addresses.
 *
 * @example
 * const user = await connect({ withEVM: true })
 * console.log(user.cadenceAddress) // 0x1d007d755531709b
 * console.log(user.evmAddress)     // 0xAbCd1234...
 */
export async function connect(options: ConnectOptions = {}): Promise<FlowKitUser> {
  const { withEVM = true } = options

  await fcl.authenticate()

  const fclUser = await new Promise<{ addr: string; loggedIn: boolean }>((resolve) => {
    const unsub = fcl.currentUser.subscribe((u: { addr: string; loggedIn: boolean }) => {
      if (u.loggedIn) {
        unsub()
        resolve(u)
      }
    })
  })

  const cadenceAddress = fclUser.addr as CadenceAddress
  let evmAddress: EVMAddress | null = null

  if (withEVM) {
    try {
      await fcl.mutate({
        cadence: CREATE_COA_TX,
        args: (arg: (v: string, t: unknown) => unknown, t: { UFix64: unknown }) => [arg("0.0", t.UFix64)],
        limit: 999,
      })
      evmAddress = await getCOAAddress(cadenceAddress)
    } catch (err) {
      console.warn("FlowKit: COA setup failed, EVM features unavailable", err)
    }
  }

  return { cadenceAddress, evmAddress, loggedIn: true }
}

export async function disconnect(): Promise<void> {
  await fcl.unauthenticate()
}

export function subscribe(callback: (user: FlowKitUser | null) => void) {
  return fcl.currentUser.subscribe((fclUser: { loggedIn: boolean; addr?: string }) => {
    if (fclUser.loggedIn && fclUser.addr) {
      getCOAAddress(fclUser.addr).then((evmAddress) => {
        callback({
          cadenceAddress: fclUser.addr!,
          evmAddress,
          loggedIn: true,
        })
      }).catch(() => {
        callback({
          cadenceAddress: fclUser.addr!,
          evmAddress: null,
          loggedIn: true,
        })
      })
    } else {
      callback(null)
    }
  })
}

// ─── COA Address Resolution ───────────────────────────────────────

const GET_COA_ADDRESS_SCRIPT = `
import EVM from 0xEVM

access(all) fun main(address: Address): String? {
  if let coa = getAuthAccount<auth(Storage) &Account>(address).storage.borrow<&EVM.CadenceOwnedAccount>(from: /storage/evm) {
    return coa.address().toString()
  }
  return nil
}`

export async function getCOAAddress(cadenceAddress: CadenceAddress): Promise<EVMAddress | null> {
  try {
    const result = await fcl.query({
      cadence: GET_COA_ADDRESS_SCRIPT,
      args: (arg: (v: string, t: unknown) => unknown, t: { Address: unknown }) => [arg(cadenceAddress, t.Address)],
    })
    return result as EVMAddress | null
  } catch {
    return null
  }
}

export function getExplorerUrl(txHash: string): string {
  const net = getNetworkConfig()
  return `${net.explorerBase}/${txHash}`
}
