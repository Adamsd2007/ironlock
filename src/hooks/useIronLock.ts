"use client";

/**
 * IronLock.xyz — Custom Hooks
 *
 * wagmi hooks for reading contract state and managing the launch flow.
 */

import { useReadContract, useReadContracts } from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS, TOKEN_ABI, type TokenInfo } from "@/lib/contracts";

// ── Use All Tokens ───────────────────────
export function useAllTokens() {
  const { data: count } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "tokenCount",
  });

  const tokenCount = count ? Number(count) : 0;

  // Build calls for each token index
  const calls = Array.from({ length: Math.min(tokenCount, 50) }, (_, i) => ({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "allTokens" as const,
    args: [BigInt(i)],
  }));

  const { data: addresses, isLoading } = useReadContracts({
    contracts: calls,
    query: { enabled: tokenCount > 0 },
  });

  const tokenAddresses: string[] = addresses
    ?.map((r) => (r.result as string) || "")
    .filter(Boolean)
    .reverse() || [];

  return { tokenAddresses, tokenCount, isLoading };
}

// ── Use Token Info ───────────────────────
export function useTokenInfo(tokenAddress: string | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "tokens",
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress },
  });

  if (!data) return { info: null, isLoading, error };

  const info: TokenInfo = {
    tokenAddress: data[0] as string,
    dev: data[1] as string,
    name: data[2] as string,
    symbol: data[3] as string,
    totalSupply: data[4] as bigint,
    raiseCap: data[5] as bigint,
    totalRaised: data[6] as bigint,
    lpLockDays: data[7] as bigint,
    vestingDays: data[8] as bigint,
    devAllocationBps: data[9] as number,
    launchTime: data[10] as bigint,
    antiSnipeEnd: data[11] as bigint,
    milestoneReleased: data[12] as number,
    milestone1Time: data[13] as bigint,
    milestone2Time: data[14] as bigint,
    milestone3Time: data[15] as bigint,
    safetyScore: data[16] as number,
    active: data[17] as boolean,
    refundVoteActive: data[18] as boolean,
  };

  return { info, isLoading, error };
}

// ── Use Token Balance ────────────────────
export function useTokenBalance(
  tokenAddress: string | undefined,
  holderAddress: string | undefined
) {
  return useReadContract({
    address: tokenAddress as `0x${string}` | undefined,
    abi: TOKEN_ABI,
    functionName: "balanceOf",
    args: holderAddress ? [holderAddress as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress && !!holderAddress },
  });
}

// ── Use Contribution ─────────────────────
export function useContribution(
  tokenAddress: string | undefined,
  contributor: string | undefined
) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "contributions",
    args: tokenAddress && contributor
      ? [tokenAddress as `0x${string}`, contributor as `0x${string}`]
      : undefined,
    query: { enabled: !!tokenAddress && !!contributor },
  });
}

// ── Use Factory Constants ────────────────
export function useFactoryConstants() {
  return useReadContracts({
    contracts: [
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "MIN_LP_LOCK_DAYS" },
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "MIN_VESTING_DAYS" },
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "MAX_DEV_BPS" },
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "ANTI_SNIPE_SECONDS" },
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "ANTI_SNIPE_MAX_BNB" },
      { address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "DAILY_SELL_CAP_BPS" },
    ],
  });
}

// ── Use Token Vested Amount ──────────────
export function useVestedAmount(tokenAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}` | undefined,
    abi: TOKEN_ABI,
    functionName: "vestedAmount",
    query: { enabled: !!tokenAddress },
  });
}

// ── Use Anti-Snipe Status ────────────────
export function useAntiSnipeStatus(tokenAddress: string | undefined) {
  return useReadContract({
    address: tokenAddress as `0x${string}` | undefined,
    abi: TOKEN_ABI,
    functionName: "antiSnipeEnd",
    query: { enabled: !!tokenAddress },
  });
}
