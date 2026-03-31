import { useState, useCallback } from 'react'
import { sponsor, needsSponsorship } from '../src/sponsor'
import type { SponsoredTxOptions, SponsoredTxResult } from '../src/sponsor'
import type { CadenceAddress } from '../src/types'

interface UseGasSponsorReturn {
  sponsor: (options: SponsoredTxOptions) => Promise<SponsoredTxResult>
  checkNeedsSponsorship: (address: CadenceAddress) => Promise<boolean>
  isLoading: boolean
  error: Error | null
}

export function useGasSponsor(): UseGasSponsorReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSponsor = useCallback(async (options: SponsoredTxOptions) => {
    setIsLoading(true)
    setError(null)
    try {
      return await sponsor(options)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sponsor: handleSponsor,
    checkNeedsSponsorship: needsSponsorship,
    isLoading,
    error,
  }
}
