/**
 * IronLock.xyz — Launch Utilities
 *
 * Handles calling IronLockFactory.launchToken() and contribute() via wagmi/viem.
 */

import {
  writeContract,
  waitForTransactionReceipt,
  readContract,
  type WriteContractErrorType,
} from "@wagmi/core";
import { parseEther } from "viem";
import { wagmiConfig } from "@/app/providers";
import {
  FACTORY_ABI,
  FACTORY_ADDRESS,
  BSCSCAN_URL,
  type LaunchParams,
  type TokenInfo,
} from "./contracts";

// ── Launch a Token ───────────────────────
export async function launchToken(params: LaunchParams): Promise<{
  success: boolean;
  tokenAddress?: string;
  txHash?: string;
  bscscanUrl?: string;
  error?: string;
}> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "launchToken",
      args: [
        params.name,
        params.symbol,
        BigInt(params.totalSupply),
        BigInt(params.raiseCap),
        BigInt(params.lpLockDays),
        BigInt(params.vestingDays),
        params.devAllocationBps,
        BigInt(params.eligibilityDeadline),
        params.eligibilitySignature as `0x${string}`,
        BigInt(params.softCapBps),
        BigInt(params.presaleDays),
      ],
      // value is now typed correctly in the new payable ABI
      value: parseEther("0.11"), // launch fee 0.01 + dev stake 0.1 BNB
      gas: 8_000_000n, // Cap gas for token deployment (avoids RPC limit)
    } as any);

    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    // Parse the TokenLaunched event to get the token address
    let tokenAddress: string | undefined;
    for (const log of receipt.logs) {
      try {
        // The token address is the first indexed param of TokenLaunched
        if (log.address.toLowerCase() === FACTORY_ADDRESS.toLowerCase()) {
          // Try to decode as TokenLaunched
          const topics = (log as any).topics;
          if (topics && topics.length >= 3) {
            // topics[1] = token address (indexed)
            tokenAddress = "0x" + topics[1].slice(26);
            break;
          }
        }
      } catch {
        // Skip logs we can't decode
      }
    }

    return {
      success: true,
      tokenAddress,
      txHash,
      bscscanUrl: `${BSCSCAN_URL}/tx/${txHash}`,
    };
  } catch (err: any) {
    console.error("Launch failed:", err);
    let error = "Transaction failed";
    if (err?.shortMessage) error = err.shortMessage;
    else if (err?.message) error = err.message;
    return { success: false, error };
  }
}

// ── Contribute to a Presale ──────────────
export async function contributeToToken(
  tokenAddress: string,
  amountInBnb: string
): Promise<{
  success: boolean;
  txHash?: string;
  bscscanUrl?: string;
  error?: string;
}> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "contribute",
      args: [tokenAddress as `0x${string}`],
      value: parseEther(amountInBnb),
      gas: 1_000_000n, // Cap gas to avoid RPC limit (public RPC cap: 16,777,216)
    });

    const receipt = await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    return {
      success: true,
      txHash,
      bscscanUrl: `${BSCSCAN_URL}/tx/${txHash}`,
    };
  } catch (err: any) {
    console.error("Contribute failed:", err);
    let error = "Transaction failed";
    if (err?.shortMessage) error = err.shortMessage;
    else if (err?.message) error = err.message;
    return { success: false, error };
  }
}

// ── Release Milestone ────────────────────
export async function releaseMilestone(
  tokenAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "releaseMilestone",
      args: [tokenAddress as `0x${string}`],
    });

    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    return { success: true, txHash };
  } catch (err: any) {
    return { success: false, error: err?.shortMessage || err?.message };
  }
}

// ── Cast Refund Vote ─────────────────────
export async function castRefundVote(
  tokenAddress: string,
  vote: boolean
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "voteRefund",
      args: [tokenAddress as `0x${string}`, vote],
    });

    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    return { success: true, txHash };
  } catch (err: any) {
    return { success: false, error: err?.shortMessage || err?.message };
  }
}

// ── Claim Refund ─────────────────────────
export async function claimRefund(
  tokenAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "claimRefund",
      args: [tokenAddress as `0x${string}`],
    });

    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    return { success: true, txHash };
  } catch (err: any) {
    return { success: false, error: err?.shortMessage || err?.message };
  }
}

// ── Start Refund Vote ────────────────────
export async function startRefundVote(
  tokenAddress: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const txHash = await writeContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "startRefundVote",
      args: [tokenAddress as `0x${string}`],
    });

    await waitForTransactionReceipt(wagmiConfig, {
      hash: txHash,
      timeout: 120_000,
    });

    return { success: true, txHash };
  } catch (err: any) {
    return { success: false, error: err?.shortMessage || err?.message };
  }
}

// ── Read Token Info ──────────────────────
export async function fetchTokenInfo(
  tokenAddress: string
): Promise<TokenInfo | null> {
  try {
    const info = await readContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "getTokenInfo",
      args: [tokenAddress as `0x${string}`],
    });

    // getTokenInfo returns: name, symbol, totalSupply, raiseCap, lpLockDays,
    // vestingDays, devAllocationBps, launchTime, totalRaised, milestoneReleased,
    // active, dev, antiSnipeEnd, safetyScore
    const launchTime = info[7] as bigint;

    return {
      tokenAddress,
      dev: info[11] as string,
      name: info[0] as string,
      symbol: info[1] as string,
      totalSupply: info[2] as bigint,
      raiseCap: info[3] as bigint,
      totalRaised: info[8] as bigint,
      lpLockDays: info[4] as bigint,
      vestingDays: info[5] as bigint,
      devAllocationBps: Number(info[6]),
      launchTime,
      antiSnipeEnd: info[12] as bigint,
      milestoneReleased: Number(info[9]),
      milestone1Time: launchTime,
      milestone2Time: launchTime + BigInt(30 * 86400),
      milestone3Time: launchTime + BigInt(90 * 86400),
      safetyScore: Number(info[13]),
      active: info[10] as boolean,
      refundVoteActive: false,
    };
  } catch (err) {
    console.error("Fetch token info failed:", err);
    return null;
  }
}

// ── Fetch All Tokens ─────────────────────
export async function fetchAllTokens(): Promise<string[]> {
  try {
    const tokens = await readContract(wagmiConfig, {
      address: FACTORY_ADDRESS,
      abi: FACTORY_ABI,
      functionName: "getTokenAddresses",
      args: [FACTORY_ADDRESS],
    });
    return [...(tokens as string[])].reverse(); // newest first
  } catch (err) {
    console.error("Fetch all tokens failed:", err);
    return [];
  }
}
