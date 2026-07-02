import { NextRequest, NextResponse } from "next/server";
import knownScamLabels from "@/data/known-scam-labels.json";

// ── Constants ────────────────────────────
const GOPLUS_URL = "https://api.gopluslabs.io/api/v1/address_security";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 5000;
const MAX_GOPLUS_PER_MINUTE = 25;

// ── GoPlus rate limiter ──────────────────
const goPlusRequestTimes: number[] = [];

function canCallGoPlus(): boolean {
  const now = Date.now();
  while (goPlusRequestTimes.length > 0 && goPlusRequestTimes[0] < now - 60_000) {
    goPlusRequestTimes.shift();
  }
  if (goPlusRequestTimes.length >= MAX_GOPLUS_PER_MINUTE) return false;
  goPlusRequestTimes.push(now);
  return true;
}

// ── Security cache ───────────────────────
const securityCache = new Map<string, { data: SecurityResult; expiresAt: number }>();

// ── Types ────────────────────────────────
interface SecurityResult {
  isFlagged: boolean;
  flags: string[];
  source: string;
  riskLevel: "clean" | "warning" | "danger" | "unknown";
  checkedAt: number;
}

const GOPLUS_FLAGS = [
  "cybercrime", "money_laundering", "financial_crime",
  "darkweb_transactions", "phishing_activities", "blackmail_activities",
  "stealing_attack", "fake_kyc", "malicious_mining_activities",
  "mixer", "sanctioned",
];

const DANGER_FLAGS = ["cybercrime", "stealing_attack", "phishing_activities", "sanctioned"];
const WARNING_FLAGS = ["money_laundering", "fake_kyc", "mixer"];

// ── Check known scam labels ───────────────
function checkKnownLabels(address: string): string[] {
  const labels: string[] = [];
  const key = address.toLowerCase() as keyof typeof knownScamLabels;
  if (knownScamLabels[key]) {
    labels.push(knownScamLabels[key] as string);
  }
  return labels;
}

// ── GoPlus API call ──────────────────────
async function checkGoPlus(address: string): Promise<string[]> {
  if (!canCallGoPlus()) return []; // rate limited, skip

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${GOPLUS_URL}/${address}?chain_id=56`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.result?.[address.toLowerCase()] || {};

    const flags: string[] = [];
    for (const flag of GOPLUS_FLAGS) {
      if (result[flag] === "1") flags.push(flag.replace(/_/g, " "));
    }
    return flags;
  } catch {
    clearTimeout(timeout);
    return [];
  }
}

// ── Determine risk level ──────────────────
function assessRisk(flags: string[]): "clean" | "warning" | "danger" {
  if (flags.length === 0) return "clean";

  for (const flag of flags) {
    for (const danger of DANGER_FLAGS) {
      if (flag.includes(danger)) return "danger";
    }
  }
  for (const flag of flags) {
    for (const warning of WARNING_FLAGS) {
      if (flag.includes(warning)) return "warning";
    }
  }
  return "warning"; // any unknown flag → warning
}

// ── GET handler ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({
      isFlagged: false, flags: [], source: "", riskLevel: "clean", checkedAt: 0,
    } satisfies SecurityResult, { status: 400 });
  }

  // Check cache
  const cached = securityCache.get(address.toLowerCase());
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json(cached.data);
  }

  try {
    // Run all checks in parallel
    const [goPlusFlags, bscscanLabels] = await Promise.all([
      checkGoPlus(address),
      Promise.resolve(checkKnownLabels(address)),
    ]);

    const allFlags = [...goPlusFlags, ...bscscanLabels];
    const riskLevel = assessRisk(allFlags);
    const source = goPlusFlags.length > 0
      ? "GoPlus Security"
      : bscscanLabels.length > 0
      ? "BSCScan Labels"
      : "";

    const result: SecurityResult = {
      isFlagged: allFlags.length > 0,
      flags: allFlags,
      source,
      riskLevel: allFlags.length === 0 ? "clean" : riskLevel,
      checkedAt: Date.now(),
    };

    // Cache
    securityCache.set(address.toLowerCase(), {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(result);
  } catch {
    // API failure — return unknown gracefully
    const result: SecurityResult = {
      isFlagged: false, flags: [], source: "",
      riskLevel: "unknown", checkedAt: Date.now(),
    };
    return NextResponse.json(result);
  }
}
