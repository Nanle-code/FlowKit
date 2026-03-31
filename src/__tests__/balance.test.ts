/**
 * Unit tests for multi-token balance queries
 */

import { 
  balance, 
  getMultiTokenBalance,
  getCadenceTokenBalance,
  getCOATokenBalance,
  getEVMTokenBalance 
} from "../balance"
import { getTokenConfig } from "../tokens"

jest.mock("@onflow/fcl")

describe("FlowKit Multi-Token Balance", () => {
  const mockCadenceAddress = "0x1d007d755531709b"
  const mockEVMAddress = "0x1234567890123456789012345678901234567890"

  describe("Single Token Balance", () => {
    it("should query FLOW balance for Cadence address", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("10.50000000")

      const result = await balance(mockCadenceAddress, "FLOW")

      expect(result.total).toBeDefined()
      expect(parseFloat(result.total)).toBeGreaterThanOrEqual(0)
    })

    it("should query USDC balance for Cadence address", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("100.500000")

      const result = await balance(mockCadenceAddress, "USDC")

      expect(result.total).toBeDefined()
      expect(result.cadence).toBeDefined()
      expect(result.evm).toBeDefined()
    })

    it("should query balance for EVM address", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("50.00000000")

      const result = await balance(mockEVMAddress, "FLOW")

      expect(result.evm).toBeDefined()
      expect(result.cadence).toBe("0.00000000")
    })
  })

  describe("Multi-Token Balance", () => {
    it("should query multiple token balances", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("10.00000000")

      const result = await getMultiTokenBalance(mockCadenceAddress, ["FLOW", "USDC", "USDT"])

      expect(result.FLOW).toBeDefined()
      expect(result.USDC).toBeDefined()
      expect(result.USDT).toBeDefined()
      expect(result.FLOW.symbol).toBe("FLOW")
      expect(result.USDC.symbol).toBe("USDC")
    })

    it("should handle failed token queries gracefully", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockRejectedValue(new Error("Query failed"))

      const result = await getMultiTokenBalance(mockCadenceAddress, ["FLOW", "USDC"])

      // Should return empty object or partial results
      expect(result).toBeDefined()
    })
  })

  describe("Cadence Token Balance", () => {
    it("should query Cadence vault balance", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("25.50000000")

      const tokenConfig = getTokenConfig("FLOW")
      const result = await getCadenceTokenBalance(mockCadenceAddress, tokenConfig)

      expect(result).toBe("25.50000000")
    })

    it("should return zero for non-existent vault", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockRejectedValue(new Error("Vault not found"))

      const tokenConfig = getTokenConfig("USDC")
      const result = await getCadenceTokenBalance(mockCadenceAddress, tokenConfig)

      expect(result).toBe("0.000000")
    })
  })

  describe("COA Token Balance", () => {
    it("should query COA FLOW balance", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query
        .mockResolvedValueOnce(mockEVMAddress) // getCOAAddress
        .mockResolvedValueOnce("5.00000000")   // balance

      const tokenConfig = getTokenConfig("FLOW")
      const result = await getCOATokenBalance(mockCadenceAddress, tokenConfig)

      expect(parseFloat(result)).toBeGreaterThanOrEqual(0)
    })

    it("should query COA ERC-20 balance", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query
        .mockResolvedValueOnce(mockEVMAddress) // getCOAAddress
        .mockResolvedValueOnce("1000000")      // balance in smallest unit

      const tokenConfig = getTokenConfig("USDC")
      const result = await getCOATokenBalance(mockCadenceAddress, tokenConfig)

      expect(result).toBeDefined()
    })

    it("should return zero if no COA exists", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue(null)

      const tokenConfig = getTokenConfig("FLOW")
      const result = await getCOATokenBalance(mockCadenceAddress, tokenConfig)

      expect(result).toBe("0.00000000")
    })
  })

  describe("EVM Token Balance", () => {
    it("should query native FLOW balance", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("15.00000000")

      const result = await getEVMTokenBalance(
        mockEVMAddress,
        "0x0000000000000000000000000000000000000000",
        8
      )

      expect(result).toBe("15.00000000")
    })

    it("should query ERC-20 balance", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("5000000") // 5 USDC in micro-units

      const tokenConfig = getTokenConfig("USDC")
      const result = await getEVMTokenBalance(
        mockEVMAddress,
        tokenConfig.evmContract,
        tokenConfig.decimals
      )

      expect(parseFloat(result)).toBeGreaterThanOrEqual(0)
    })

    it("should handle query failures", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockRejectedValue(new Error("Query failed"))

      const result = await getEVMTokenBalance(mockEVMAddress, "0x1234...", 18)

      expect(result).toBe("0.000000000000000000")
    })
  })

  describe("Balance Formatting", () => {
    it("should format FLOW balance with 8 decimals", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("10.5")

      const result = await balance(mockCadenceAddress, "FLOW")

      expect(result.total).toMatch(/^\d+\.\d{8}$/)
    })

    it("should format USDC balance with 6 decimals", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query.mockResolvedValue("100.5")

      const result = await balance(mockCadenceAddress, "USDC")

      expect(result.total).toMatch(/^\d+\.\d{6}$/)
    })
  })

  describe("Cross-VM Balance Aggregation", () => {
    it("should sum Cadence and EVM balances", async () => {
      const fcl = require("@onflow/fcl")
      fcl.query
        .mockResolvedValueOnce("10.00000000") // Cadence
        .mockResolvedValueOnce(mockEVMAddress) // COA address
        .mockResolvedValueOnce("5.00000000")   // EVM

      const result = await balance(mockCadenceAddress, "FLOW")

      expect(parseFloat(result.total)).toBe(
        parseFloat(result.cadence) + parseFloat(result.evm)
      )
    })
  })
})
