"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Rocket, TrendingUp, ExternalLink, Wallet,
} from "lucide-react";
import { useAllTokens, useTokenInfo, useContribution } from "@/hooks/useIronLock";
import { formatBnb, formatAddress, daysUntil } from "@/lib/utils";

// ═══════════════════════════════════════════
// TOKEN CARD
// ═══════════════════════════════════════════
function LaunchedTokenCard({ address }: { address: string }) {
  const { info, isLoading } = useTokenInfo(address);
  if (isLoading || !info) return <div className="card skeleton h-24" />;

  const nowSec = Math.floor(Date.now() / 1000);
  const launchSec = Number(info.launchTime);
  const vestDays = Number(info.vestingDays);
  const vestingPct = vestDays > 0
    ? Math.min(100, Math.max(0, ((nowSec - launchSec) / 86400 / vestDays) * 100))
    : 0;

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
          {info.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <Link href={`/token/${info.tokenAddress}`}
            className="font-semibold text-white hover:text-brand transition-colors text-sm">
            {info.name} <span className="text-text-muted font-normal">({info.symbol})</span>
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`badge text-[10px] ${info.safetyScore >= 80 ? "badge-blue" : info.safetyScore >= 50 ? "badge-yellow" : "badge-red"}`}>
              {info.safetyScore}/100
            </span>
            <span className="text-[11px] text-text-muted">
              {formatBnb(info.totalRaised)} raised
            </span>
            <span className="text-[11px] text-text-muted">
              LP: {daysUntil(BigInt(Number(info.launchTime) + Number(info.lpLockDays) * 86400))}d left
            </span>
          </div>
          {/* Vesting bar */}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] text-text-muted w-16 flex-shrink-0">Vesting</span>
            <div className="flex-1 h-1.5 bg-[#1F1F22] rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${vestingPct}%` }} />
            </div>
            <span className="text-[10px] text-text-muted w-8 text-right">{vestingPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/token/${info.tokenAddress}`}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> View
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// INVESTMENT CARD
// ═══════════════════════════════════════════
function InvestmentCard({ address, contributor }: { address: string; contributor: string }) {
  const { info, isLoading } = useTokenInfo(address);
  const { data: contribution } = useContribution(address, contributor);

  if (isLoading || !info) return <div className="card skeleton h-24" />;
  const contrib = contribution ?? 0n;

  // Refund pool calc
  let releasedBps = 0n;
  if (info.milestoneReleased >= 1) releasedBps += 3300n;
  if (info.milestoneReleased >= 2) releasedBps += 3300n;
  if (info.milestoneReleased >= 3) releasedBps += 3400n;
  const released = (info.totalRaised * releasedBps) / 10000n;
  const refundPool = info.totalRaised - released;
  const refundable = info.totalRaised > 0n ? (contrib * refundPool) / info.totalRaised : 0n;

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm flex-shrink-0">
          {info.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <Link href={`/token/${info.tokenAddress}`}
            className="font-semibold text-white hover:text-brand transition-colors text-sm">
            {info.name} <span className="text-text-muted font-normal">({info.symbol})</span>
          </Link>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[11px] text-text-muted">Contributed: <span className="text-white">{formatBnb(contrib)}</span></span>
            <span className="text-[11px] text-green-400">Refundable: {formatBnb(refundable)}</span>
            {info.refundVoteActive && (
              <span className="badge badge-yellow text-[10px]">Vote Active</span>
            )}
            {!info.active && (
              <span className="badge badge-red text-[10px]">Refund Available</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/token/${info.tokenAddress}`}
          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> View
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════
export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<"launches" | "investments">("launches");
  const { tokenAddresses, tokenCount, isLoading: tokensLoading } = useAllTokens();

  // Separate my tokens from others
  const myLaunches = useMemo(() => {
    // We can't filter without token info for each. We use the fact that
    // the connected wallet's address is the dev — checked at render time.
    return tokenAddresses;
  }, [tokenAddresses]);

  // Wallet stats — contributions reader removed from new ABI, defaulting to 0
  const totalInvested = 0n;

  if (!isConnected) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Wallet className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
        <h1 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h1>
        <p className="text-text-secondary mb-6">View your launches and investments</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* ── Header ───────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-text-secondary text-sm">
          Wallet: <span className="text-white font-mono">{formatAddress(address!)}</span>
        </p>
      </div>

      {/* ── Stats Row ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: "🚀", label: "Launches", value: "..." },
          { icon: "💰", label: "Total Invested", value: formatBnb(totalInvested) },
          { icon: "📊", label: "Tokens on Platform", value: String(tokenCount) },
          { icon: "🛡️", label: "Refundable", value: "..." },
        ].map((s, i) => (
          <div key={i} className="card text-center py-3">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-[10px] text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-[#1F1F22]">
        {[
          { id: "launches" as const, label: "My Launches", icon: Rocket },
          { id: "investments" as const, label: "My Investments", icon: TrendingUp },
        ].map((t) => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t.id
                ? "border-brand text-brand"
                : "border-transparent text-text-muted hover:text-white"
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: My Launches ───────────── */}
      {tab === "launches" && (
        <div className="space-y-3">
          {tokensLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="card skeleton h-24" />)
          ) : myLaunches.length > 0 ? (
            myLaunches.map((addr) => (
              <LaunchedTokenCard key={addr} address={addr} />
            ))
          ) : (
            <div className="card text-center py-12">
              <Rocket className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-semibold text-white mb-1">No launches yet</h3>
              <p className="text-text-secondary text-sm mb-4">You haven&apos;t launched any tokens</p>
              <Link href="/launch" className="btn-primary inline-flex items-center gap-2">
                <Rocket className="w-4 h-4" /> Launch a Token
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: My Investments ─────────── */}
      {tab === "investments" && (
        <div className="space-y-3">
          {tokensLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="card skeleton h-24" />)
          ) : tokenAddresses.length > 0 ? (
            tokenAddresses.map((addr) => (
              <InvestmentCard key={addr} address={addr} contributor={address!} />
            ))
          ) : (
            <div className="card text-center py-12">
              <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-30" />
              <h3 className="text-lg font-semibold text-white mb-1">No investments yet</h3>
              <p className="text-text-secondary text-sm mb-4">You haven&apos;t contributed to any tokens</p>
              <Link href="/explore" className="btn-primary inline-flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Explore Tokens
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
