/**
 * IronLock.xyz — Live Stats from On-Chain Data
 *
 * Reads real values from the deployed IronLockFactory contract.
 * Results are cached for 60 seconds to limit RPC calls.
 */

import { FACTORY_ABI } from "./contracts";

// ── Constants ────────────────────────────
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9";
const BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org";
const CACHE_TTL_MS = 60_000; // 60 seconds

// ── Cache ────────────────────────────────
interface StatsCache {
  tokenCount: number;
  totalRaised: bigint;
  insurancePool: bigint;
  fetchedAt: number;
}

let cache: StatsCache | null = null;

// ── Helpers ──────────────────────────────
async function getFactoryRead(): Promise<any> {
  // Dynamic import: ethers is heavy, only load when actually fetching stats
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  return new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
}

function isCacheValid(): boolean {
  return cache !== null && Date.now() - cache.fetchedAt < CACHE_TTL_MS;
}

// ── Public API ───────────────────────────
export interface LiveStats {
  tokenCount: number;
  totalRaisedFormatted: string;
  insurancePoolFormatted: string;
  rugpullsPrevented: number;
}

/**
 * Fetch live stats from the IronLockFactory contract.
 * Uses a 60-second in-memory cache to avoid excessive RPC calls.
 */
export async function fetchLiveStats(): Promise<LiveStats> {
  if (isCacheValid() && cache) {
    return formatStats(cache);
  }

  const factory = await getFactoryRead();

  // Fetch token count
  const tokenCountRaw = await factory.tokenCount();
  const tokenCount = Number(tokenCountRaw);

  // Fetch all token addresses
  const allTokens: string[] = await factory.getAllTokens();

  // Sum totalRaised across all tokens
  let totalRaised = 0n;
  // Batch reads: read tokens() for each address
  if (allTokens.length > 0) {
    // Read in batches of 10 to avoid RPC rate limits
    const batchSize = 10;
    for (let i = 0; i < allTokens.length; i += batchSize) {
      const batch = allTokens.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map((addr) => factory.tokens(addr).catch(() => null))
      );
      for (const info of results) {
        if (info && info.totalRaised) {
          totalRaised += BigInt(info.totalRaised);
        }
      }
    }
  }

  // Fetch insurance pool
  const insurancePoolRaw = await factory.insurancePool().catch(() => 0n);
  const insurancePool = BigInt(insurancePoolRaw);

  // Update cache
  cache = {
    tokenCount,
    totalRaised,
    insurancePool,
    fetchedAt: Date.now(),
  };

  return formatStats(cache);
}

// ── Formatting ───────────────────────────
function formatStats(data: StatsCache): LiveStats {
  return {
    tokenCount: data.tokenCount,
    totalRaisedFormatted: formatBnbRound(data.totalRaised),
    insurancePoolFormatted: formatBnbRound(data.insurancePool),
    rugpullsPrevented: 0, // enforced by contract — always 0
  };
}

function formatBnbRound(wei: bigint): string {
  const bnb = Number(wei) / 1e18;
  if (bnb >= 1000) return bnb.toFixed(2);
  if (bnb >= 1) return bnb.toFixed(4);
  if (bnb >= 0.001) return bnb.toFixed(6);
  return bnb.toFixed(8);
}
