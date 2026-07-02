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
  // ── Constants ──
  {
    inputs: [],
    name: "MIN_LP_LOCK_DAYS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MIN_VESTING_DAYS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "MAX_DEV_BPS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ANTI_SNIPE_SECONDS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ANTI_SNIPE_MAX_BNB",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DAILY_SELL_CAP_BPS",
    outputs: [{ internalType: "uint16", name: "", type: "uint16" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "DEV_STAKE_AMOUNT",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ── Launch ──
  {
    inputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint256", name: "totalSupply", type: "uint256" },
      { internalType: "uint256", name: "raiseCap", type: "uint256" },
      { internalType: "uint256", name: "lpLockDays", type: "uint256" },
      { internalType: "uint256", name: "vestingDays", type: "uint256" },
      { internalType: "uint16", name: "devAllocationBps", type: "uint16" },
      { internalType: "uint256", name: "eligibilityDeadline", type: "uint256" },
      { internalType: "bytes", name: "eligibilitySignature", type: "bytes" },
      { internalType: "uint256", name: "softCapBps", type: "uint256" },
      { internalType: "uint256", name: "presaleDays", type: "uint256" },
    ],
    name: "launchToken",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Contribute ──
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
    ],
    name: "contribute",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  // ── Milestones ──
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
    ],
    name: "releaseMilestone",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Refund ──
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
    ],
    name: "startRefundVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
      { internalType: "bool", name: "voteYes", type: "bool" },
    ],
    name: "castRefundVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
    ],
    name: "executeRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
    ],
    name: "claimRefund",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Dev Activity ──
  {
    inputs: [],
    name: "updateDevActivity",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── View Functions ──
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "tokens",
    outputs: [
      { internalType: "address", name: "tokenAddress", type: "address" },
      { internalType: "address", name: "dev", type: "address" },
      { internalType: "string", name: "name", type: "string" },
      { internalType: "string", name: "symbol", type: "string" },
      { internalType: "uint256", name: "totalSupply", type: "uint256" },
      { internalType: "uint256", name: "raiseCap", type: "uint256" },
      { internalType: "uint256", name: "totalRaised", type: "uint256" },
      { internalType: "uint256", name: "lpLockDays", type: "uint256" },
      { internalType: "uint256", name: "vestingDays", type: "uint256" },
      { internalType: "uint16", name: "devAllocationBps", type: "uint16" },
      { internalType: "uint256", name: "launchTime", type: "uint256" },
      { internalType: "uint256", name: "antiSnipeEnd", type: "uint256" },
      { internalType: "uint8", name: "milestoneReleased", type: "uint8" },
      { internalType: "uint256", name: "milestone1Time", type: "uint256" },
      { internalType: "uint256", name: "milestone2Time", type: "uint256" },
      { internalType: "uint256", name: "milestone3Time", type: "uint256" },
      { internalType: "uint8", name: "safetyScore", type: "uint8" },
      { internalType: "bool", name: "active", type: "bool" },
      { internalType: "bool", name: "refundVoteActive", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllTokens",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "tokenCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "tokenAddr", type: "address" }],
    name: "getSafetyScore",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "launchFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isIronLockToken",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "isBlacklisted",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
      { internalType: "address", name: "contributor", type: "address" },
    ],
    name: "contributions",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "devLastActivity",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "tokenAddr", type: "address" }],
    name: "isRefundVotePassed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "allTokens",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // ── Dev Stake ──
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "devStakes",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "insurancePool",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "tokenAddr", type: "address" }],
    name: "claimDevStake",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Events ──
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: true, internalType: "address", name: "dev", type: "address" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: false, internalType: "string", name: "symbol", type: "string" },
      { indexed: false, internalType: "uint256", name: "totalSupply", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "raiseCap", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "lpLockDays", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "vestingDays", type: "uint256" },
      { indexed: false, internalType: "uint16", name: "devAllocationBps", type: "uint16" },
      { indexed: false, internalType: "uint8", name: "safetyScore", type: "uint8" },
    ],
    name: "TokenLaunched",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: true, internalType: "address", name: "contributor", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "Contributed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: false, internalType: "uint8", name: "milestone", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "MilestoneReleased",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
    ],
    name: "RefundVoteStarted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "dev", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "DevStakeSlashed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "dev", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "DevStakeClaimed",
    type: "event",
  },
  // ── Sybil Protection ──
  {
    inputs: [
      { internalType: "address", name: "tokenAddr", type: "address" },
      { internalType: "address", name: "suspiciousWallet", type: "address" },
      { internalType: "string", name: "reason", type: "string" },
    ],
    name: "reportSuspiciousWallet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }],
    name: "hasContributed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }, { internalType: "address", name: "", type: "address" }],
    name: "isBlockedContributor",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: true, internalType: "address", name: "reporter", type: "address" },
      { indexed: true, internalType: "address", name: "suspiciousWallet", type: "address" },
      { indexed: false, internalType: "string", name: "reason", type: "string" },
    ],
    name: "WalletReported",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "token", type: "address" },
      { indexed: true, internalType: "address", name: "wallet", type: "address" },
    ],
    name: "WalletBlocked",
    type: "event",
  },
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
