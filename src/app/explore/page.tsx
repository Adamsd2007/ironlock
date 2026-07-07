"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, TrendingUp, Shield, ShieldCheck, Clock, ArrowUpRight,
  ChevronDown, Lock, Zap, Sparkles, Loader2, Calculator,
  ChevronUp,
} from "lucide-react";
import { useAllTokens, useTokenInfo } from "@/hooks/useIronLock";
import { useReadContract } from "wagmi";
import { FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { formatAddress, formatBnb, formatTokens, formatDate, daysUntil } from "@/lib/utils";
import { getRefundPool } from "@/lib/refund";
import { TrustBadge } from "@/components/TrustBadge";

const PAGE_SIZE = 12;

// ═══════════════════════════════════════════
// FEATURED TOKEN CARD (large, top section)
// ═══════════════════════════════════════════
function FeaturedCard({ address }: { address: string }) {
  const { info, isLoading } = useTokenInfo(address);
  if (isLoading || !info) return <div className="card skeleton h-40" />;

  const progress = info.raiseCap > 0n ? Number((info.totalRaised * 10000n) / info.raiseCap) / 100 : 0;
  const lpUnlockDate = BigInt(Number(info.launchTime) + Number(info.lpLockDays) * 86400);
  const lpRemaining = daysUntil(lpUnlockDate);

  return (
    <Link href={`/token/${info.tokenAddress}`}
      className="card block hover:border-brand/40 transition-all duration-300 group relative overflow-hidden">
      <div className="absolute top-3 right-3">
        <span className={`badge text-[10px] ${info.safetyScore >= 80 ? "badge-blue" : info.safetyScore >= 50 ? "badge-yellow" : "badge-red"}`}>
          {info.safetyScore}/100
        </span>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
          {info.symbol.slice(0, 2)}
        </div>
        <div>
          <h3 className="font-bold text-white text-lg group-hover:text-brand transition-colors">
            {info.name} <span className="text-text-muted text-sm font-normal">({info.symbol})</span>
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="inline-flex items-center gap-1 text-[10px] text-green-400">
              <ShieldCheck className="w-3 h-3" /> Verified
            </span>
            <span className="text-[10px] text-text-muted">Launched {formatDate(info.launchTime)}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded-lg bg-[#0A0A0B]">
          <div className="text-sm font-bold text-white">{formatBnb(info.totalRaised)}</div>
          <div className="text-[10px] text-text-muted">Raised</div>
        </div>
        <div className="p-2 rounded-lg bg-[#0A0A0B]">
          <div className="text-sm font-bold text-white">{lpRemaining}d</div>
          <div className="text-[10px] text-text-muted">LP Lock Left</div>
        </div>
        <div className="p-2 rounded-lg bg-[#0A0A0B]">
          <div className="text-sm font-bold text-white">{info.milestoneReleased}/3</div>
          <div className="text-[10px] text-text-muted">Milestones</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="w-full h-2 bg-[#1F1F22] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-1">
          <span>{progress.toFixed(0)}% of {formatBnb(info.raiseCap)}</span>
          <span>{info.active ? "🟢 Active" : "🔴 Ended"}</span>
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════
// RISK DOT (external security check)
// Uses a module-level cache to avoid N+1 API calls across cards.
// ═══════════════════════════════════════════
const riskCache = new Map<string, { risk: string; ts: number }>();
const RISK_CACHE_TTL = 30 * 60_000; // 30 minutes

function RiskDot({ devAddress }: { devAddress: string }) {
  const [risk, setRisk] = useState<string | null>(null);
  useEffect(() => {
    const cached = riskCache.get(devAddress.toLowerCase());
    if (cached && Date.now() - cached.ts < RISK_CACHE_TTL) {
      setRisk(cached.risk);
      return;
    }
    let cancelled = false;
    fetch(`/api/wallet-security-check?address=${devAddress}`)
      .then(r => r.json())
      .then(d => {
        if (!cancelled) {
          setRisk(d.riskLevel);
          riskCache.set(devAddress.toLowerCase(), { risk: d.riskLevel, ts: Date.now() });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [devAddress]);
  if (!risk || risk === "clean") return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px]" title={risk === "danger" ? "High risk wallet" : "Warning flags"}>
      {risk === "danger" ? "🚨" : "⚠️"}
    </span>
  );
}

// ═══════════════════════════════════════════
// GRID TOKEN CARD
// ═══════════════════════════════════════════
function TokenCard({ address, rank }: { address: string; rank?: number }) {
  const { info, isLoading } = useTokenInfo(address);
  const { data: contributorCount } = useReadContract({
    address: FACTORY_ADDRESS, abi: FACTORY_ABI,
    functionName: "getContributorCount",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });
  if (isLoading || !info) return <div className="card skeleton h-32" />;

  const progress = info.raiseCap > 0n ? Number((info.totalRaised * 10000n) / info.raiseCap) / 100 : 0;
  const cc = contributorCount ? Number(contributorCount) : 0;
  const nowS = Math.floor(Date.now() / 1000);
  const launchS = Number(info.launchTime);
  const vestDays = Number(info.vestingDays);
  const vestingPct = vestDays > 0 ? Math.min(100, Math.max(0, ((nowS - launchS) / 86400 / vestDays) * 100)) : 0;

  return (
    <Link href={`/token/${info.tokenAddress}`}
      className="card block hover:border-brand/30 transition-all duration-300 group relative">
      {rank && (
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
          {rank}
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
            {info.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm group-hover:text-brand transition-colors">
              {info.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted font-mono">{info.symbol}</span>
              <ShieldCheck className="w-3 h-3 text-green-400" />
            </div>
            <div className="text-[10px] text-text-muted/60 mt-0.5">
              by <a href={`/dev/${info.dev}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand transition-colors relative z-10">{formatAddress(info.dev)}</a>
            </div>
          </div>
        </div>
        <TrustBadge token={{ antiSnipeEnd: info.antiSnipeEnd, lpLockDays: info.lpLockDays, vestingDays: info.vestingDays, devAllocationBps: info.devAllocationBps, raiseCap: info.raiseCap, softCap: 0n, safetyScore: info.safetyScore }} size="sm" />
      </div>

      {/* Risk dot + Contributor count */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <RiskDot devAddress={info.dev} />
        {cc > 0 && (
          <span className={`badge text-[10px] ${cc >= 20 ? "badge-blue" : cc >= 10 ? "badge-yellow" : "badge-red"}`}>
            {cc >= 20 ? "🟢" : cc >= 10 ? "🟡" : "🔴"} {cc} contributors
          </span>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[11px] mb-1">
          <span className="text-text-muted">Raised</span>
          <span className="text-white font-medium">{formatBnb(info.totalRaised)} / {formatBnb(info.raiseCap)}</span>
        </div>
        <div className="w-full h-1.5 bg-[#1F1F22] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${progress >= 100 ? "bg-green-400" : "bg-brand"}`} style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-text-muted">
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" />{info.lpLockDays.toString()}d lock</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{vestingPct.toFixed(0)}% vested</span>
        <span className="flex items-center gap-1 text-brand group-hover:underline">View<ArrowUpRight className="w-3 h-3" /></span>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════
// REFUND CALCULATOR (collapsible)
// ═══════════════════════════════════════════
function TokenRefundCalc({ address, amount }: { address: string; amount: string }) {
  const { info, isLoading } = useTokenInfo(address);
  const investAmount = parseFloat(amount);
  if (!address || !address.startsWith("0x") || investAmount <= 0 || isNaN(investAmount) || !isFinite(investAmount)) {
    return (<div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]"><p className="text-xs text-text-muted">Enter a valid token address and investment amount</p></div>);
  }
  if (isLoading) return (<div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22] animate-pulse"><div className="h-8 skeleton w-full rounded" /></div>);
  if (!info) return (<div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]"><p className="text-xs text-red-400">⚠️ Token not found on IronLock</p><p className="text-[10px] text-text-muted mt-1">Make sure this is a valid IronLock token address</p></div>);

  const investWei = BigInt(Math.floor(investAmount * 1e18));
  const lockedFunds = getRefundPool(info.totalRaised, info.milestoneReleased);
  const maxRefund = info.totalRaised > 0n ? (investWei * lockedFunds) / info.totalRaised : 0n;
  const tokenAmount = info.raiseCap > 0n && info.totalSupply > 0n ? (info.totalSupply * investWei) / info.raiseCap : 0n;
  const protectionPct = investAmount > 0 && info.totalRaised > 0n ? ((Number(maxRefund) / 1e18) / investAmount) * 100 : 0;

  return (<div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
      <div><p className="text-[10px] text-text-muted">Investment</p><p className="text-sm font-semibold text-white">{investAmount.toFixed(2)} BNB</p></div>
      <div><p className="text-[10px] text-text-muted">Tokens</p><p className="text-sm font-semibold text-white">{formatTokens(tokenAmount)}</p></div>
      <div><p className="text-[10px] text-text-muted">Locked Pool</p><p className="text-sm font-semibold text-white">{formatBnb(lockedFunds)}</p></div>
      <div><p className="text-[10px] text-text-muted">Max Refund</p><p className="text-sm font-semibold text-brand">{formatBnb(maxRefund)}</p></div>
    </div>
    <div className="mt-3 px-3 py-2 rounded-lg bg-brand/5 border border-brand/10 flex items-center gap-2">
      <Shield className="w-4 h-4 text-brand flex-shrink-0" />
      <p className="text-[11px] text-text-secondary">Up to <span className="text-white font-semibold">{formatBnb(maxRefund)}</span> protected ({protectionPct.toFixed(1)}% of your investment)</p>
    </div>
    {info.milestoneReleased >= 3 && (<div className="mt-2 px-3 py-1.5 rounded-lg bg-yellow-400/5 border border-yellow-400/20"><p className="text-[10px] text-yellow-400/80 text-center">⚠️ All 3 milestones released — refund pool is empty</p></div>)}
    {info.totalRaised === 0n && (<div className="mt-2 px-3 py-1.5 rounded-lg bg-blue-400/5 border border-blue-400/20"><p className="text-[10px] text-blue-400/80 text-center">💡 No funds raised yet — refund pool will grow as contributions come in</p></div>)}
  </div>);
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════
type SortMode = "newest" | "raised" | "score";
type FilterMode = "all" | "active" | "ended";

export default function ExplorePage() {
  const { tokenAddresses, tokenCount, isLoading } = useAllTokens();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("newest");
  const [filterBy, setFilterBy] = useState<FilterMode>("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showCalc, setShowCalc] = useState(false);
  const [calcAddr, setCalcAddr] = useState("");
  const [calcAmt, setCalcAmt] = useState("1");

  // Sort & filter — token info is loaded per-card via useTokenInfo,
  // so we can only filter by address here. Full sort/filter happens
  // when the contract adds getTokensPaginated support.
  const processed = useMemo(() => {
    let list = [...tokenAddresses];

    // Search filter (by address only — name/symbol info loads per-card)
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.toLowerCase().includes(q));
    }

    // Filter: newest first is the default (contract returns newest last)
    // Other sort modes (raised, score) require on-chain data per token
    // and will be supported when getTokensPaginated is integrated.

    return list;
  }, [tokenAddresses, search]);

  const visible = processed.slice(0, visibleCount);
  const hasMore = visibleCount < processed.length;

  // Featured = newest 3 (from original list, before search)
  const featured = tokenAddresses.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* ── Header ───────────────────────── */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1F1F22] bg-[#141416] mb-4">
          <TrendingUp className="w-4 h-4 text-brand" />
          <span className="text-sm text-text-secondary">{tokenCount} Tokens Launched</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Explore <span className="brand-text">Tokens</span>
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Browse all memecoins launched through IronLock.xyz with verified on-chain safety features.
        </p>
      </div>

      {/* ── Featured Tokens ───────────────── */}
      {featured.length > 0 && !search && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand" />
            Recently Launched
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {featured.map((addr) => (
              <FeaturedCard key={addr} address={addr} />
            ))}
          </div>
        </section>
      )}

      {/* ── Search + Filter ──────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by token address or name..." className="input-field pl-10 font-mono text-sm" />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortMode)}
          className="input-field w-44 appearance-none cursor-pointer">
          <option value="newest">Newest First</option>
          <option value="raised">Most Raised</option>
          <option value="score">Highest Trust Score</option>
        </select>
        <select value={filterBy} onChange={(e) => setFilterBy(e.target.value as FilterMode)}
          className="input-field w-40 appearance-none cursor-pointer">
          <option value="all">All Tokens</option>
          <option value="active">Raising</option>
          <option value="ended">Complete</option>
        </select>
      </div>

      {/* ── Calculator Toggle ─────────────── */}
      <div className="mb-6">
        <button onClick={() => setShowCalc(!showCalc)}
          className="w-full card flex items-center justify-between hover:border-brand/20 transition-colors py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Calculator className="w-4 h-4 text-brand" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-white">Refund Calculator</span>
              <p className="text-xs text-text-muted">See your protection before investing</p>
            </div>
          </div>
          {showCalc ? <ChevronUp className="w-5 h-5 text-text-muted" /> : <ChevronDown className="w-5 h-5 text-text-muted" />}
        </button>
        {showCalc && (
          <div className="mt-3 card space-y-4 animate-slide-up">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Token Address</label>
                <input type="text" value={calcAddr} onChange={(e) => setCalcAddr(e.target.value)}
                  placeholder="0x..." className="input-field font-mono text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Investment (BNB)</label>
                <input type="number" value={calcAmt} onChange={(e) => setCalcAmt(e.target.value)}
                  placeholder="1" className="input-field text-sm" />
              </div>
            </div>
            <TokenRefundCalc address={calcAddr} amount={calcAmt} />
          </div>
        )}
      </div>

      {/* ── Token Grid ────────────────────── */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card skeleton h-32" />
          ))}
        </div>
      ) : processed.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((addr, i) => (
              <TokenCard key={addr} address={addr} rank={!search ? i + 1 : undefined} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-8">
              <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="btn-secondary inline-flex items-center gap-2 text-sm px-8 py-3">
                <Loader2 className="w-4 h-4" />
                Load More ({processed.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-16">
          <Shield className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
          {tokenCount === 0 ? (
            <>
              <h3 className="text-xl font-bold text-white mb-2">No tokens launched yet</h3>
              <p className="text-text-secondary mb-6">Be the first to launch a rugpull-proof token on IronLock!</p>
              <Link href="/launch" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
                <Zap className="w-5 h-5" /> Launch a Token
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-xl font-bold text-white mb-2">No results</h3>
              <p className="text-text-secondary">Try a different search or filter</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
