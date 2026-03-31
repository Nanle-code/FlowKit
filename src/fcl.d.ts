// Type declarations for @onflow/fcl
declare module "@onflow/fcl" {
  export function config(options: Record<string, string>): void
  export function authenticate(): Promise<void>
  export function unauthenticate(): Promise<void>
  
  export interface CurrentUser {
    subscribe(callback: (user: { addr?: string; loggedIn: boolean }) => void): () => void
  }
  
  export const currentUser: CurrentUser
  export const authz: unknown
  
  export interface MutateOptions {
    cadence: string
    args?: (arg: (value: unknown, type: unknown) => unknown, t: unknown) => unknown[]
    limit?: number
    proposer?: unknown
    authorizations?: unknown[]
    payer?: unknown
  }
  
  export function mutate(options: MutateOptions): Promise<string>
  
  export interface QueryOptions {
    cadence: string
    args?: (arg: (value: unknown, type: unknown) => unknown, t: unknown) => unknown[]
  }
  
  export function query(options: QueryOptions): Promise<unknown>
}
