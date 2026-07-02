"use client";

import { calculateTrustScore, getTrustSummary } from "@/lib/trustScore";

interface TrustBadgeProps {
  token: {
    antiSnipeEnd?: bigint; lpLockDays?: bigint; vestingDays?: bigint;
    devAllocationBps?: number; raiseCap?: bigint; softCap?: bigint;
    safetyScore?: number;
  };
  size?: "sm" | "lg";
}

export function TrustBadge({ token, size = "sm" }: TrustBadgeProps) {
  const score = calculateTrustScore(token);
  const colors = {
    green: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", bar: "bg-emerald-400" },
    yellow: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", bar: "bg-yellow-400" },
    red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", bar: "bg-red-400" },
  };
  const c = colors[score.color];

  if (size === "sm") {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${c.bg} ${c.border} ${c.text} text-xs font-bold`}>
        🛡 {score.total}
      </span>
    );
  }

  return (
    <div className={`rounded-2xl border ${c.bg} ${c.border} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Trust Score</h3>
        <span className={`text-3xl font-extrabold ${c.text}`}>{score.total}<span className="text-sm text-text-muted">/100</span></span>
      </div>
      <div className="w-full h-2.5 bg-[#1F1F22] rounded-full overflow-hidden mb-2">
        <div className={`h-full ${c.bar} rounded-full transition-all duration-1000`} style={{ width: `${score.total}%` }} />
      </div>
      <p className={`text-xs font-semibold ${c.text} mb-4`}>{score.label}</p>
      <div className="space-y-1.5">
        {score.factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-xs group relative">
            <span className="text-text-secondary flex items-center gap-1.5">
              {f.earned ? "✅" : "❌"} {f.name}
              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute left-0 -top-8 bg-[#1A1A1E] border border-[#2A2A2E] rounded-lg px-2 py-1 text-[10px] text-text-secondary whitespace-nowrap z-10 pointer-events-none">
                {f.description}
              </span>
            </span>
            <span className={f.earned ? "text-green-400" : "text-text-muted/40"}>+{f.points}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-muted mt-4 leading-relaxed border-t border-[#1F1F22] pt-3">
        {getTrustSummary(score)}
      </p>
    </div>
  );
}
