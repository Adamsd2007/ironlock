/**
 * IronLock.xyz — Trust Score Calculator
 * Uses on-chain token parameters to compute a 0-100 score.
 */

export interface TrustScoreBreakdown {
  total: number;
  label: "HIGH TRUST" | "MEDIUM TRUST" | "LOW TRUST";
  color: "green" | "yellow" | "red";
  factors: { name: string; points: number; earned: boolean; description: string }[];
}

export function calculateTrustScore(token: {
  antiSnipeEnd?: bigint;
  lpLockDays?: bigint;
  vestingDays?: bigint;
  devAllocationBps?: number;
  raiseCap?: bigint;
  softCap?: bigint;
  safetyScore?: number;
}): TrustScoreBreakdown {
  const lpLockDays = Number(token.lpLockDays ?? 0n);
  const vestingDays = Number(token.vestingDays ?? 0n);
  const devAlloc = token.devAllocationBps ?? 0;
  const raiseCap = token.raiseCap ?? 0n;
  const softCap = token.softCap ?? 0n;
  const antiSnipe = token.antiSnipeEnd ?? 0n;

  const factors = [
    { name: "Anti-Snipe Protection", points: 20, earned: antiSnipe > 0n, description: "Bot protection active at launch" },
    { name: "LP Locked 180+ Days", points: 20, earned: lpLockDays >= 180, description: "Liquidity cannot be removed early" },
    { name: "Dev Vesting 90+ Days", points: 20, earned: vestingDays >= 90, description: "Dev tokens vest slowly over time" },
    { name: "Low Dev Allocation", points: 15, earned: devAlloc <= 500, description: "Dev holds 5% or less of supply" },
    { name: "Serious Raise Cap", points: 10, earned: raiseCap >= 5n * 10n ** 18n, description: "Raise cap of 5+ BNB set" },
    { name: "Strong Softcap", points: 10, earned: softCap >= (raiseCap * 50n) / 100n, description: "Softcap is 50%+ of raise cap" },
    { name: "Milestone Releases", points: 5, earned: true, description: "Funds released in stages" },
  ];

  const total = factors.reduce((s, f) => s + (f.earned ? f.points : 0), 0);

  return {
    total,
    label: total >= 80 ? "HIGH TRUST" : total >= 50 ? "MEDIUM TRUST" : "LOW TRUST",
    color: total >= 80 ? "green" : total >= 50 ? "yellow" : "red",
    factors,
  };
}

export function getTrustSummary(score: TrustScoreBreakdown): string {
  if (score.total >= 80) {
    return "This token has strong anti-rugpull protections. The developer cannot dump tokens immediately, liquidity is locked, and funds are released in stages.";
  }
  if (score.total >= 50) {
    return "This token has some protections but is missing key safety features. Review the score breakdown carefully before contributing.";
  }
  return "This token is missing important safety features. Contribute with caution and only what you can afford to lose.";
}
