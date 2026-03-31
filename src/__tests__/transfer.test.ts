/**
 * Unit tests for multi-token transfer functionality
 * 
 * Run with: npm test (after setting up Jest)
 */

import { transfer, estimateTransferGas } from "../transfer"
import { detectVM, detectTransferRoute } from "../detect"
import { getTokenConfig } from "../tokens"
import type { TransferParams } from "../types"

// Mock FCL
jest.mock("@onflow/fcl", () => ({
  mutate: jest.fn(),
  query: jest.fn(),
  config: jest.fn(),
}))

describe("FlowKit Multi-Token Transfer", () => {
  describe("Token Configuration", () => {
    it("should get FLOW token config", () => {
      const config = getTokenConfig("FLOW", "mainnet")
      expect(config.symbol).toBe("FLOW")
      expect(config.decimals).toBe(8)
      expect(config.cadenceContract).toBe("FlowToken")
    })

    it("should get USDC token config", () => {
      const config = getTokenConfig("USDC", "mainnet")
      expect(config.symbol).toBe("USDC")
      expect(config.decimals).toBe(6)
      expect(config.cadenceContract).toBe("FiatToken")
    })

    it("should get USDT token config", () => {
      const config = getTokenConfig("USDT", "mainnet")
      expect(config.symbol).toBe("USDT")
      expect(config.decimals).toBe(6)
    })

    it("should handle custom ERC-20 address", () => {
      const customAddress = "0x1234567890123456789012345678901234567890"
      const config = getTokenConfig(customAddress, "mainnet")
      expect(config.symbol).toBe("CUSTOM")
      expect(config.evmContract).toBe(customAddress)
      expect(config.decimals).toBe(18)
    })

    it("should apply testnet overrides", () => {
      const config = getTokenConfig("FLOW", "testnet")
      expect(config.cadenceAddress).toBe("0x7e60df042a9c0868")
    })

    it("should throw error for unknown token", () => {
      expect(() => getTokenConfig("INVALID", "mainnet")).toThrow()
    })
  })

  describe("Route Detection", () => {
    it("should detect Cadence → Cadence route", () => {
      const from = "0x1d007d755531709b"
      const to = "0x2e007d755531709c"
      const route = detectTransferRoute(from, to)
      expect(route).toBe("cadence")
    })

    it("should detect Cadence → EVM route", () => {
      const from = "0x1d007d755531709b"
      const to = "0x1234567890123456789012345678901234567890"
      const route = detectTransferRoute(from, to)
      expect(route).toBe("cross-vm")
    })

    it("should detect EVM → EVM route", () => {
      const from = "0x1234567890123456789012345678901234567890"
      const to = "0x0987654321098765432109876543210987654321"
      const route = detectTransferRoute(from, to)
      expect(route).toBe("evm")
    })

    it("should detect EVM → Cadence route", () => {
      const from = "0x1234567890123456789012345678901234567890"
      const to = "0x1d007d755531709b"
      const route = detectTransferRoute(from, to)
      expect(route).toBe("cross-vm")
    })
  })

  describe("FLOW Transfers", () => {
    it("should transfer FLOW Cadence → Cadence", async () => {
      const params: TransferParams = {
        token: "FLOW",
        amount: "10.5",
        to: "0x2e007d755531709c",
      }

      // Mock FCL mutate
      const fcl = require("@onflow/fcl")
      fcl.mutate.mockResolvedValue("0xmocktxhash")

      const result = await transfer(params)

      expect(result.token).toBe("FLOW")
      expect(result.route).toBe("cadence-to-cadence")
      expect(result.txHash).toBe("0xmocktxhash")
    })

    it("should transfer FLOW Cadence → EVM", async () => {
      const params: TransferParams = {
        token: "FLOW",
        amount: "5.0",
        to: "0x1234567890123456789012345678901234567890",
      }

      const fcl = require("@onflow/fcl")
      fcl.mutate.mockResolvedValue("0xmocktxhash")

      const result = await transfer(params)

      expect(result.token).toBe("FLOW")
      expect(result.route).toBe("cadence-to-evm")
      expect(result.vm).toBe("cross-vm")
    })
  })

  describe("USDC Transfers", () => {
    it("should transfer USDC Cadence → Cadence", async () => {
      const params: TransferParams = {
        token: "USDC",
        amount: "100.50",
        to: "0x2e007d755531709c",
      }

      const fcl = require("@onflow/fcl")
      fcl.mutate.mockResolvedValue("0xmocktxhash")

      const result = await transfer(params)

      expect(result.token).toBe("USDC")
      expect(result.route).toBe("cadence-to-cadence")
    })

    it("should transfer USDC Cadence → EVM via bridge", async () => {
      const params: TransferParams = {
        token: "USDC",
        amount: "50.0",
        to: "0x1234567890123456789012345678901234567890",
      }

      const fcl = require("@onflow/fcl")
      fcl.mutate.mockResolvedValue("0xmocktxhash")

      const result = await transfer(params)

      expect(result.token).toBe("USDC")
      expect(result.route).toBe("cadence-to-evm")
      expect(result.vm).toBe("cross-vm")
    })
  })

  describe("Custom ERC-20 Transfers", () => {
    it("should transfer custom ERC-20 EVM → EVM", async () => {
      const customToken = "0x1234567890123456789012345678901234567890"
      const params: TransferParams = {
        token: customToken,
        amount: "25.5",
        from: "0x0987654321098765432109876543210987654321",
        to: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
      }

      // Mock window.ethereum
      global.window = {
        ethereum: {
          request: jest.fn().mockResolvedValue("0xmocktxhash"),
        },
      } as any

      const result = await transfer(params)

      expect(result.route).toBe("evm-to-evm")
      expect(result.vm).toBe("evm")
    })
  })

  describe("Gas Estimation", () => {
    it("should estimate gas for Cadence transfer", async () => {
      const params: TransferParams = {
        token: "FLOW",
        amount: "1.0",
        to: "0x2e007d755531709c",
      }

      const gas = await estimateTransferGas(params)
      expect(gas).toBeGreaterThan(0)
    })

    it("should estimate gas for cross-VM transfer", async () => {
      const params: TransferParams = {
        token: "USDC",
        amount: "100",
        to: "0x1234567890123456789012345678901234567890",
      }

      const gas = await estimateTransferGas(params)
      expect(gas).toBeGreaterThan(100)
    })
  })

  describe("Error Handling", () => {
    it("should throw error for invalid amount", async () => {
      const params: TransferParams = {
        token: "FLOW",
        amount: "invalid",
        to: "0x2e007d755531709c",
      }

      await expect(transfer(params)).rejects.toThrow()
    })

    it("should throw error for invalid address", async () => {
      const params: TransferParams = {
        token: "FLOW",
        amount: "1.0",
        to: "invalid-address",
      }

      await expect(transfer(params)).rejects.toThrow()
    })

    it("should provide detailed error messages", async () => {
      const params: TransferParams = {
        token: "USDC",
        amount: "100",
        to: "0x2e007d755531709c",
      }

      const fcl = require("@onflow/fcl")
      fcl.mutate.mockRejectedValue(new Error("Transaction failed"))

      await expect(transfer(params)).rejects.toThrow(/FlowKit transfer failed/)
    })
  })

  describe("Amount Formatting", () => {
    it("should format FLOW amount to 8 decimals", () => {
      const config = getTokenConfig("FLOW")
      expect(config.decimals).toBe(8)
    })

    it("should format USDC amount to 6 decimals", () => {
      const config = getTokenConfig("USDC")
      expect(config.decimals).toBe(6)
    })

    it("should format custom token to 18 decimals", () => {
      const config = getTokenConfig("0x1234567890123456789012345678901234567890")
      expect(config.decimals).toBe(18)
    })
  })
})
