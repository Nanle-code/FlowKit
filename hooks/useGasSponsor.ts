/**
 * useGasSponsor - Execute transactions with zero gas fees for users
 * 
 * Wagmi-style hook for Flow's native gas sponsorship feature.
 * Users sign transactions but don't pay fees - your backend sponsor covers costs.
 */

import { useState, useCallback } from "react"
import { sponsor as sdkSponsor, needsSponsorship as sdkNeedsSponsorship } from "../src/index"
import type { CadenceAddress } from "../src/types"
import type { UseGasSponsorConfig, UseGasSponsorReturn } from "./types"

/**
 * Execute sponsored transactions (zero gas for users)
 * 
 * @example
 * ```tsx
 * function MintNFT() {
 *   const { sponsor, isLoading, error } = useGasSponsor({
 *     sponsor: '0xYourBackendSponsor',
 *     onSuccess: (result) => {
 *       console.log('Minted! TX:', result.txHash)
 *       console.log('User paid: $0 (sponsored)')
 *     }
 *   })
 * 
 *   const handleMint = async () => {
 *     await sponsor(MINT_NFT_TRANSACTION, (arg, t) => [
 *       arg(metadata, t.String),
 *       arg(recipient, t.Address)
 *     ])
 *   }
 * 
 *   return (
 *     <button onClick={handleMint} disabled={isLoading}>
 *       {isLoading ? 'Minting...' : 'Mint NFT (Free!)'}
 *     </button>
 *   )
 * }
 * ```
 * 
 * @example
 * ```tsx
 * // Onboard new users with zero friction
 * const { sponsor } = useGasSponsor({
 *   sponsor: BACKEND_SPONSOR_ADDRESS
 * })
 * 
 * // User signs up with social login (no wallet, no tokens)
 * await sponsor(CREATE_PROFILE_TX, (arg, t) => [
 *   arg(username, t.String),
 *   arg(avatar, t.String)
 * ])
 * // User's profile is created, they paid $0
 * ```
 */
export function useGasSponsor(config: UseGasSponsorConfig): UseGasSponsorReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const sponsor = useCallback(
    async (cadence: string, args?: any) => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await sdkSponsor({
          cadence,
          args,
          sponsor: config.sponsor,
        })

        config.onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setError(error)
        config.onError?.(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [config]
  )

  return {
    sponsor,
    isLoading,
    error,
  }
}

/**
 * Check if an address needs gas sponsorship
 * 
 * @example
 * ```tsx
 * function SmartButton() {
 *   const { needsSponsorship, isLoading } = useNeedsSponsorship(userAddress)
 *   const { sponsor } = useGasSponsor({ sponsor: BACKEND_SPONSOR })
 *   const { transfer } = useFlowTransfer()
 * 
 *   const handleTransaction = async () => {
 *     if (needsSponsorship) {
 *       // User has no FLOW - sponsor the transaction
 *       await sponsor(TRANSFER_TX, ...)
 *     } else {
 *       // User has FLOW - regular transaction
 *       await transfer(...)
 *     }
 *   }
 * 
 *   return (
 *     <button onClick={handleTransaction}>
 *       {needsSponsorship ? 'Send (Sponsored)' : 'Send'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useNeedsSponsorship(address: CadenceAddress | undefined) {
  const [needsSponsorship, setNeedsSponsorship] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const check = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      const needs = await sdkNeedsSponsorship(address)
      setNeedsSponsorship(needs)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useState(() => {
    check()
  })

  return {
    needsSponsorship,
    isLoading,
    error,
    refetch: check,
  }
}

/**
 * Hook for sponsored onboarding flow
 * 
 * @example
 * ```tsx
 * function OnboardingFlow() {
 *   const { 
 *     createProfile, 
 *     mintWelcomeNFT, 
 *     isOnboarding 
 *   } = useSponsoredOnboarding({
 *     sponsor: BACKEND_SPONSOR
 *   })
 * 
 *   const handleOnboard = async () => {
 *     // All sponsored - user pays nothing
 *     await createProfile({ username: 'alice', avatar: '...' })
 *     await mintWelcomeNFT({ recipient: userAddress })
 *   }
 * 
 *   return (
 *     <button onClick={handleOnboard} disabled={isOnboarding}>
 *       {isOnboarding ? 'Setting up...' : 'Get Started (Free!)'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useSponsoredOnboarding(config: { sponsor: string }) {
  const { sponsor, isLoading } = useGasSponsor(config)

  const createProfile = useCallback(
    async (params: { username: string; avatar: string }) => {
      const CREATE_PROFILE_TX = `
        transaction(username: String, avatar: String) {
          prepare(signer: auth(Storage) &Account) {
            // Create profile logic
          }
        }
      `

      return sponsor(CREATE_PROFILE_TX, (arg: any, t: any) => [
        arg(params.username, t.String),
        arg(params.avatar, t.String),
      ])
    },
    [sponsor]
  )

  const mintWelcomeNFT = useCallback(
    async (params: { recipient: string }) => {
      const MINT_WELCOME_NFT_TX = `
        transaction(recipient: Address) {
          prepare(signer: auth(Storage) &Account) {
            // Mint welcome NFT logic
          }
        }
      `

      return sponsor(MINT_WELCOME_NFT_TX, (arg: any, t: any) => [arg(params.recipient, t.Address)])
    },
    [sponsor]
  )

  return {
    createProfile,
    mintWelcomeNFT,
    isOnboarding: isLoading,
  }
}
