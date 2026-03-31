import { useState, useCallback, useEffect } from "react"
import { 
  transferNFT, 
  getNFTMetadata, 
  getNFTBalance,
  type NFTTransferParams,
  type NFTTransferResult,
  type NFTMetadata,
  type NFTBalanceResult,
} from "../src/nft"
import type { UseMutationState } from "./types"

/**
 * useNFTTransfer - Transfer NFTs across VMs
 * 
 * @example
 * ```tsx
 * const { transfer, isLoading, error } = useNFTTransfer()
 * 
 * await transfer({
 *   collection: 'TopShot',
 *   tokenId: '12345',
 *   to: '0xAbCd...' // Auto-detects EVM and bridges
 * })
 * ```
 */
export function useNFTTransfer() {
  const [state, setState] = useState<UseMutationState<NFTTransferResult>>({
    data: null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  })

  const transfer = useCallback(async (params: NFTTransferParams) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await transferNFT(params)
      setState({
        data: result,
        error: null,
        isLoading: false,
        isSuccess: true,
        isError: false,
      })
      return result
    } catch (error: any) {
      setState({
        data: null,
        error: error.message,
        isLoading: false,
        isSuccess: false,
        isError: true,
      })
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    })
  }, [])

  return {
    transfer,
    reset,
    ...state,
  }
}

/**
 * useNFTMetadata - Fetch NFT metadata from any VM
 * 
 * @example
 * ```tsx
 * const { metadata, isLoading, refetch } = useNFTMetadata(
 *   '0x1d007d...',
 *   'TopShot',
 *   '12345'
 * )
 * 
 * return (
 *   <div>
 *     <img src={metadata?.image} />
 *     <h3>{metadata?.name}</h3>
 *     <p>{metadata?.description}</p>
 *   </div>
 * )
 * ```
 */
export function useNFTMetadata(
  address: string | null,
  collection: string,
  tokenId: string,
  config?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMetadata = useCallback(async () => {
    if (!address || !collection || !tokenId) return
    if (config?.enabled === false) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getNFTMetadata(address, collection, tokenId)
      setMetadata(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [address, collection, tokenId, config?.enabled])

  useEffect(() => {
    fetchMetadata()

    // Auto-refetch if interval is set
    if (config?.refetchInterval) {
      const interval = setInterval(fetchMetadata, config.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchMetadata, config?.refetchInterval])

  return {
    metadata,
    isLoading,
    error,
    refetch: fetchMetadata,
  }
}

/**
 * useNFTBalance - Get NFT IDs owned by an address
 * 
 * @example
 * ```tsx
 * const { balance, isLoading } = useNFTBalance(
 *   '0x1d007d...',
 *   'TopShot'
 * )
 * 
 * return (
 *   <div>
 *     <p>You own {balance?.count} NFTs</p>
 *     <ul>
 *       {balance?.tokenIds.map(id => (
 *         <li key={id}>NFT #{id}</li>
 *       ))}
 *     </ul>
 *   </div>
 * )
 * ```
 */
export function useNFTBalance(
  address: string | null,
  collection: string,
  config?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  const [balance, setBalance] = useState<NFTBalanceResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!address || !collection) return
    if (config?.enabled === false) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await getNFTBalance(address, collection)
      setBalance(result)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [address, collection, config?.enabled])

  useEffect(() => {
    fetchBalance()

    // Auto-refetch if interval is set
    if (config?.refetchInterval) {
      const interval = setInterval(fetchBalance, config.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchBalance, config?.refetchInterval])

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  }
}

/**
 * useNFTCollection - Manage NFT collection state
 * 
 * Combines balance and metadata fetching for multiple NFTs
 * 
 * @example
 * ```tsx
 * const { nfts, isLoading, refetch } = useNFTCollection(
 *   '0x1d007d...',
 *   'TopShot'
 * )
 * 
 * return (
 *   <div>
 *     {nfts.map(nft => (
 *       <NFTCard key={nft.tokenId} {...nft} />
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useNFTCollection(
  address: string | null,
  collection: string,
  config?: {
    enabled?: boolean
    refetchInterval?: number
    maxNFTs?: number
  }
) {
  const [nfts, setNfts] = useState<NFTMetadata[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCollection = useCallback(async () => {
    if (!address || !collection) return
    if (config?.enabled === false) return

    setIsLoading(true)
    setError(null)

    try {
      // Get token IDs
      const balance = await getNFTBalance(address, collection)
      
      // Limit number of NFTs to fetch metadata for
      const maxNFTs = config?.maxNFTs || 20
      const tokenIds = balance.tokenIds.slice(0, maxNFTs)

      // Fetch metadata for each NFT
      const metadataPromises = tokenIds.map(tokenId =>
        getNFTMetadata(address, collection, tokenId)
      )

      const metadata = await Promise.all(metadataPromises)
      setNfts(metadata)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [address, collection, config?.enabled, config?.maxNFTs])

  useEffect(() => {
    fetchCollection()

    // Auto-refetch if interval is set
    if (config?.refetchInterval) {
      const interval = setInterval(fetchCollection, config.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchCollection, config?.refetchInterval])

  return {
    nfts,
    count: nfts.length,
    isLoading,
    error,
    refetch: fetchCollection,
  }
}
