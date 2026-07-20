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
  const { data, isLoading } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTokensPaginated",
    args: [0n, 1000n], // offset=0, limit=1000 — paginated replacement for getAllTokens
  });

  // getTokensPaginated returns [address[], uint256]
  const tokenAddresses: string[] = data
    ? [...((data as any)[0] as string[])].reverse()
    : [];

  return { tokenAddresses, tokenCount: tokenAddresses.length, isLoading };
}

// ── Use Token Info ───────────────────────
export function useTokenInfo(tokenAddress: string | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "getTokenInfo",
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress },
  });

  if (!data || !tokenAddress) return { info: null, isLoading, error };

  // getTokenInfo returns: name, symbol, totalSupply, raiseCap, lpLockDays,
  // vestingDays, devAllocationBps, launchTime, totalRaised, milestoneReleased,
  // active, dev, antiSnipeEnd, safetyScore
  const launchTime = data[7] as bigint;

  const info: TokenInfo = {
    tokenAddress,
    dev: data[11] as string,
    name: data[0] as string,
    symbol: data[1] as string,
    totalSupply: data[2] as bigint,
    raiseCap: data[3] as bigint,
    totalRaised: data[8] as bigint,
    lpLockDays: data[4] as bigint,
    vestingDays: data[5] as bigint,
    devAllocationBps: Number(data[6]),
    launchTime,
    antiSnipeEnd: data[12] as bigint,
    milestoneReleased: Number(data[9]),
    milestone1Time: launchTime,
    milestone2Time: launchTime + BigInt(30 * 86400),
    milestone3Time: launchTime + BigInt(90 * 86400),
    safetyScore: Number(data[13]),
    active: data[10] as boolean,
    refundVoteActive: false,
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
    functionName: "getContribution",
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

// ── Use Refund Vote Status ───────────────
export function useIsRefundVoteActive(tokenAddress: string | undefined) {
  return useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "isRefundVoteActive",
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
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
