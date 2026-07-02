"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SafetyBadge } from "./SafetyBadge";
import { type TokenInfo } from "@/lib/contracts";
import { formatBnb, formatAddress } from "@/lib/utils";

interface TokenCardProps {
  info: TokenInfo;
}

export function TokenCard({ info }: TokenCardProps) {
  const progress = info.raiseCap > 0
    ? Number((info.totalRaised * BigInt(10000)) / info.raiseCap) / 100
    : 0;

  return (
    <Link
      href={`/token/${info.tokenAddress}`}
      className="card block hover:border-brand/30 transition-all duration-300 group relative overflow-hidden"
    >
      {/* Ribbon for max safety */}
      {info.safetyScore === 100 && (
        <div className="ribbon">100% Safe</div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm">
            {info.symbol.slice(0, 2)}
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-brand transition-colors">
              {info.name}
            </h3>
            <p className="text-xs text-text-muted font-mono">
              {info.symbol} · {formatAddress(info.tokenAddress)}
            </p>
          </div>
        </div>
        <SafetyBadge score={info.safetyScore} size="sm" showLabel={false} />
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-text-muted">Raised</span>
          <span className="text-white font-medium">
            {formatBnb(info.totalRaised)} / {formatBnb(info.raiseCap)}
          </span>
        </div>
        <div className="w-full h-2 bg-[#1F1F22] rounded-full overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>LP: {info.lpLockDays}d lock</span>
        <span>Vesting: {info.vestingDays}d</span>
        <span className="flex items-center gap-1 text-brand">
          View <ArrowUpRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
