import { NextRequest, NextResponse } from "next/server";
import { keccak256, encodeAbiParameters, parseAbiParameters } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// ── Constants ────────────────────────────
const MIN_WALLET_AGE_DAYS = 7;
const MIN_TX_COUNT = 10;
const ELIGIBILITY_TTL_SECONDS = 3600;
const BSCSCAN_API_URL = "https://api.bscscan.com/api";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const IS_DEV = process.env.NODE_ENV === "development";
const SKIP_CHECK = IS_DEV && process.env.NEXT_PUBLIC_SKIP_WALLET_CHECK === "true";

// ── In-Memory Rate Limiter ───────────────
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + 60_000 });
    return false;
  }
  if (record.count >= 10) return true;
  record.count++;
  return false;
}

// ── Types ────────────────────────────────
interface EligibilityResult {
  eligible: boolean;
  reason: string;
  walletAgeDays: number;
  txCount: number;
  signature: string | null;
  deadline: number | null;
}

interface BscscanTx {
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
}

// ── BSCScan API call ─────────────────────
async function fetchTransactions(address: string): Promise<BscscanTx[]> {
  const apiKeyParam = BSCSCAN_API_KEY ? `&apikey=${BSCSCAN_API_KEY}` : "";
  const url = `${BSCSCAN_API_URL}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=50&sort=asc${apiKeyParam}`;

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status === "1" && Array.isArray(data.result)) {
      return data.result as BscscanTx[];
    }

    // No transactions or error — return empty
    return [];
  } catch (err: any) {
    console.error("[Eligibility] BSCScan fetch failed:", err.message);
    throw new Error("Unable to verify wallet. Try again.");
  }
}

// ── Eligibility check ────────────────────
function checkEligibility(txs: BscscanTx[]): {
  eligible: boolean;
  reason: string;
  walletAgeDays: number;
  txCount: number;
} {
  const txCount = txs.length;
  const now = Math.floor(Date.now() / 1000);

  let walletAgeDays = 0;
  if (txCount > 0) {
    const firstTxTime = parseInt(txs[0].timeStamp, 10);
    walletAgeDays = Math.floor((now - firstTxTime) / 86400);
  }

  const ageOk = walletAgeDays >= MIN_WALLET_AGE_DAYS;
  const countOk = txCount >= MIN_TX_COUNT;

  if (ageOk && countOk) {
    return { eligible: true, reason: "Eligible", walletAgeDays, txCount };
  }
  if (!ageOk && !countOk) {
    return { eligible: false, reason: "Wallet too new and not enough transactions", walletAgeDays, txCount };
  }
  if (!ageOk) {
    return { eligible: false, reason: "Wallet too new", walletAgeDays, txCount };
  }
  return { eligible: false, reason: "Not enough transactions", walletAgeDays, txCount };
}

// ── GET handler ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  // Validate address
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({
      eligible: false, reason: "Invalid wallet address",
      walletAgeDays: 0, txCount: 0, signature: null, deadline: null,
    } satisfies EligibilityResult, { status: 400 });
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { eligible: false, reason: "Too many requests. Wait 1 minute.", walletAgeDays: 0, txCount: 0, signature: null, deadline: null },
      { status: 429 }
    );
  }

  // Dev bypass — only in development mode
  if (SKIP_CHECK) {
    const deadline = Math.floor(Date.now() / 1000) + ELIGIBILITY_TTL_SECONDS;
    let signature: string | null = null;
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;
    if (verifierKey?.startsWith("0x") && verifierKey.length === 66) {
      const account = privateKeyToAccount(verifierKey as `0x${string}`);
      const messageHash = keccak256(
        encodeAbiParameters(parseAbiParameters("address, uint256"), [address as `0x${string}`, BigInt(deadline)])
      );
      signature = await account.signMessage({ message: { raw: messageHash } });
    }
    return NextResponse.json({
      eligible: true, reason: "Dev bypass", walletAgeDays: 999, txCount: 999, signature, deadline,
    } satisfies EligibilityResult);
  }

  try {
    const txs = await fetchTransactions(address);
    const eligibility = checkEligibility(txs);

    let signature: string | null = null;
    let deadline: number | null = null;

    if (eligibility.eligible) {
      const verifierKey = process.env.VERIFIER_PRIVATE_KEY;
      if (!verifierKey?.startsWith("0x") || verifierKey.length !== 66) {
        console.error("[Eligibility] VERIFIER_PRIVATE_KEY missing or invalid");
        return NextResponse.json({
          eligible: false, reason: "Server configuration error",
          walletAgeDays: eligibility.walletAgeDays, txCount: eligibility.txCount,
          signature: null, deadline: null,
        } satisfies EligibilityResult, { status: 500 });
      }

      deadline = Math.floor(Date.now() / 1000) + ELIGIBILITY_TTL_SECONDS;
      const account = privateKeyToAccount(verifierKey as `0x${string}`);
      const messageHash = keccak256(
        encodeAbiParameters(parseAbiParameters("address, uint256"), [address as `0x${string}`, BigInt(deadline)])
      );
      signature = await account.signMessage({ message: { raw: messageHash } });
    }

    return NextResponse.json({
      eligible: eligibility.eligible, reason: eligibility.reason,
      walletAgeDays: eligibility.walletAgeDays, txCount: eligibility.txCount,
      signature, deadline,
    } satisfies EligibilityResult);
  } catch (err: any) {
    console.error("[Eligibility] Error:", err.message);
    return NextResponse.json({
      eligible: false, reason: "Unable to verify wallet. Try again.",
      walletAgeDays: 0, txCount: 0, signature: null, deadline: null,
    } satisfies EligibilityResult, { status: 500 });
  }
}
