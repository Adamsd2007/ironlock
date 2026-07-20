/**
 * IronLock.xyz — Contract ABIs and Address Helpers
 *
 * Uses wagmi for reading contract state and viem for write transactions.
 * The factory ABI is imported from Hardhat artifacts after compilation.
 * Also provides ethers Contract instances for direct chain interaction.
 */

import { getContract, type GetContractReturnType } from "viem";
import { bsc } from "wagmi/chains";
import type { ethers } from "ethers";

// ── Factory ABI ──────────────────────────
// Embedded ABI for both wagmi/viem and ethers Contract instances.
// Must match the compiled IronLockFactory artifact.

export const FACTORY_ABI = [
  // ===== Read Functions =====
  {
    "inputs": [],
    "name": "launchFee",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tokenCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_LP_LOCK_DAYS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_VESTING_DAYS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_DEV_BPS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ANTI_SNIPE_SECONDS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ANTI_SNIPE_MAX_BNB",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DAILY_SELL_CAP_BPS",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEV_STAKE_AMOUNT",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getTokenInfo",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint256", "name": "totalSupply", "type": "uint256" },
      { "internalType": "uint256", "name": "raiseCap", "type": "uint256" },
      { "internalType": "uint256", "name": "lpLockDays", "type": "uint256" },
      { "internalType": "uint256", "name": "vestingDays", "type": "uint256" },
      { "internalType": "uint256", "name": "devAllocationBps", "type": "uint256" },
      { "internalType": "uint256", "name": "launchTime", "type": "uint256" },
      { "internalType": "uint256", "name": "totalRaised", "type": "uint256" },
      { "internalType": "uint256", "name": "milestoneReleased", "type": "uint256" },
      { "internalType": "bool", "name": "active", "type": "bool" },
      { "internalType": "address", "name": "dev", "type": "address" },
      { "internalType": "uint256", "name": "antiSnipeEnd", "type": "uint256" },
      { "internalType": "uint256", "name": "safetyScore", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getLPStatus",
    "outputs": [
      { "internalType": "bool", "name": "added", "type": "bool" },
      { "internalType": "address", "name": "pair", "type": "address" },
      { "internalType": "uint256", "name": "lockedAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "unlockTime", "type": "uint256" },
      { "internalType": "bool", "name": "claimable", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getTokenAccountingStatus",
    "outputs": [
      { "internalType": "uint256", "name": "totalRaised", "type": "uint256" },
      { "internalType": "uint256", "name": "trackedInContract", "type": "uint256" },
      { "internalType": "uint256", "name": "releasedToDev", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "isBlacklisted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "dev", "type": "address" }],
    "name": "devLastActivity",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "getAntiSnipeEnd",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "offset", "type": "uint256" },
      { "internalType": "uint256", "name": "limit", "type": "uint256" }
    ],
    "name": "getTokensPaginated",
    "outputs": [
      { "internalType": "address[]", "name": "result", "type": "address[]" },
      { "internalType": "uint256", "name": "total", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "tokenAddr", "type": "address" }],
    "name": "getSafetyScore",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenAddr", "type": "address" },
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "getContribution",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "tokenAddr", "type": "address" }],
    "name": "isRefundVoteActive",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "tokenAddr", "type": "address" }],
    "name": "getContributorCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "dev", "type": "address" }],
    "name": "getDevStats",
    "outputs": [
      { "internalType": "uint256", "name": "totalLaunches", "type": "uint256" },
      { "internalType": "uint256", "name": "successful", "type": "uint256" },
      { "internalType": "uint256", "name": "refunded", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ===== Write Functions =====
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint256", "name": "totalSupply", "type": "uint256" },
      { "internalType": "uint256", "name": "raiseCap", "type": "uint256" },
      { "internalType": "uint256", "name": "lpLockDays", "type": "uint256" },
      { "internalType": "uint256", "name": "vestingDays", "type": "uint256" },
      { "internalType": "uint256", "name": "devAllocationBps", "type": "uint256" },
      { "internalType": "uint256", "name": "eligibilityDeadline", "type": "uint256" },
      { "internalType": "bytes", "name": "eligibilitySignature", "type": "bytes" },
      { "internalType": "uint256", "name": "softCapBps", "type": "uint256" },
      { "internalType": "uint256", "name": "presaleDays", "type": "uint256" }
    ],
    "name": "launchToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "releaseMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "bool", "name": "vote", "type": "bool" }
    ],
    "name": "voteRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "claimRefund",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "addLiquidityToPancakeSwap",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "claimLPTokens",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "startRefundVote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// ── Token ABI (minimal for frontend reads) ─
export const TOKEN_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "devAllocation",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vestingStart",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vestingDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vestedAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "antiSnipeEnd",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "dailySellCapBps",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// ── Factory Address ──────────────────────
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x3107378fB8D7108081c1e70CFd64B23435551193") as `0x${string}`;

// ── Chain Config ─────────────────────────
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "97");
export const METADATA_REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_METADATA_REGISTRY_ADDRESS || "0x6B9e00122F0c0D5b62B72566EfBC3f0363A6b48D") as `0x${string}`;
export const BSCSCAN_URL = process.env.NEXT_PUBLIC_BSCSCAN_URL || "https://bscscan.com";
export const BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org";

// ── Type Helpers ─────────────────────────
export interface TokenInfo {
  tokenAddress: string;
  dev: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  raiseCap: bigint;
  totalRaised: bigint;
  lpLockDays: bigint;
  vestingDays: bigint;
  devAllocationBps: number;
  launchTime: bigint;
  antiSnipeEnd: bigint;
  milestoneReleased: number;
  milestone1Time: bigint;
  milestone2Time: bigint;
  milestone3Time: bigint;
  safetyScore: number;
  active: boolean;
  refundVoteActive: boolean;
}

export interface LaunchParams {
  name: string;
  symbol: string;
  totalSupply: string;         // in wei (18 decimals)
  raiseCap: string;            // in wei (18 decimals for BNB)
  lpLockDays: number;
  vestingDays: number;
  devAllocationBps: number;
  eligibilityDeadline: number; // unix timestamp (0 to skip)
  eligibilitySignature: string; // 0x-prefixed hex ("0x" to skip)
  softCapBps: number;   // e.g. 5000 = 50% (0 to skip)
  presaleDays: number;   // 7, 14, or 30
}

// ──────────────────────────────────────────
// Ethers Contract Helpers
// ──────────────────────────────────────────

/**
 * Get the factory ABI. Uses the embedded ABI that matches the compiled artifact.
 */
export function getFactoryABI(): any[] {
  return FACTORY_ABI as unknown as any[];
}
