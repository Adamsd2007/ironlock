import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

// ── Constants ────────────────────────────
const MIN_WALLET_AGE_DAYS = 7;
const MIN_TX_COUNT = 10;
const ELIGIBILITY_TTL_SECONDS = 3600;
const BSCSCAN_API_URL = "https://api.bscscan.com/api";

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

// ── GET handler ──────────────────────────
export async function GET(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { eligible: false, reason: "Too many requests. Wait 1 minute.", walletAgeDays: 0, txCount: 0, signature: null, deadline: null },
      { status: 429 }
    );
  }

  // Get wallet address from query
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({
      eligible: false,
      reason: "Invalid wallet address",
      walletAgeDays: 0,
      txCount: 0,
      signature: null,
      deadline: null,
    }, { status: 400 });
  }

  // Dev bypass — ONLY when explicitly set to "true"
  if (process.env.NEXT_PUBLIC_SKIP_WALLET_CHECK === "true") {
    const deadline = Math.floor(Date.now() / 1000) + ELIGIBILITY_TTL_SECONDS;
    let signature: string | null = null;
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;
    if (verifierKey?.startsWith("0x") && verifierKey.length === 66) {
      const wallet = new ethers.Wallet(verifierKey);
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [address as string, deadline]
      );
      signature = await wallet.signMessage(ethers.getBytes(message));
    }
    return NextResponse.json({
      eligible: true,
      reason: "Dev bypass enabled",
      walletAgeDays: 999,
      txCount: 999,
      signature,
      deadline,
    });
  }

  // Call BSCScan API
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    console.error("[Eligibility] BSCSCAN_API_KEY not set");
    return NextResponse.json({
      eligible: false,
      reason: "Unable to verify wallet. Try again later.",
      walletAgeDays: 0,
      txCount: 0,
      signature: null,
      deadline: null,
    });
  }

  try {
    const url =
      `${BSCSCAN_API_URL}?module=account&action=txlist` +
      `&address=${address}` +
      `&startblock=0&endblock=99999999` +
      `&page=1&offset=50` +
      `&sort=asc&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // BSCScan error or no transactions — brand new wallet
    if (data.status === "0") {
      return NextResponse.json({
        eligible: false,
        walletAgeDays: 0,
        txCount: 0,
        reason:
          "Wallet too new — needs at least " +
          `${MIN_WALLET_AGE_DAYS} days old and ${MIN_TX_COUNT} transactions on BSC.`,
        signature: null,
        deadline: null,
      });
    }

    const transactions = data.result;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({
        eligible: false,
        walletAgeDays: 0,
        txCount: 0,
        reason: "No transactions found — wallet is too new.",
        signature: null,
        deadline: null,
      });
    }

    // Calculate wallet age from first transaction
    const firstTx = transactions[0];
    const firstTxTime = parseInt(firstTx.timeStamp, 10);
    const ageInDays = (Date.now() / 1000 - firstTxTime) / 86400;
    const txCount = transactions.length;

    // Check eligibility
    const ageOk = ageInDays >= MIN_WALLET_AGE_DAYS;
    const txOk = txCount >= MIN_TX_COUNT;

    if (!ageOk) {
      return NextResponse.json({
        eligible: false,
        walletAgeDays: Math.floor(ageInDays),
        txCount,
        reason:
          `Wallet too new — ${Math.floor(ageInDays)} days old, ` +
          `needs ${MIN_WALLET_AGE_DAYS}+ days.`,
        signature: null,
        deadline: null,
      });
    }

    if (!txOk) {
      return NextResponse.json({
        eligible: false,
        walletAgeDays: Math.floor(ageInDays),
        txCount,
        reason:
          `Not enough transactions — ${txCount} found, ` +
          `needs ${MIN_TX_COUNT}+.`,
        signature: null,
        deadline: null,
      });
    }

    // Eligible — sign the proof
    const verifierKey = process.env.VERIFIER_PRIVATE_KEY;
    if (!verifierKey?.startsWith("0x") || verifierKey.length !== 66) {
      console.error("[Eligibility] VERIFIER_PRIVATE_KEY missing or invalid");
      return NextResponse.json({
        eligible: false,
        reason: "Server configuration error — cannot sign eligibility proof.",
        walletAgeDays: Math.floor(ageInDays),
        txCount,
        signature: null,
        deadline: null,
      }, { status: 500 });
    }

    const deadline = Math.floor(Date.now() / 1000) + ELIGIBILITY_TTL_SECONDS;
    const wallet = new ethers.Wallet(verifierKey);
    const message = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [address, deadline]
    );
    const signature = await wallet.signMessage(ethers.getBytes(message));

    return NextResponse.json({
      eligible: true,
      walletAgeDays: Math.floor(ageInDays),
      txCount,
      reason: "Eligible",
      signature,
      deadline,
    });
  } catch (error) {
    console.error("[Eligibility] BSCScan fetch error:", error);
    return NextResponse.json({
      eligible: false,
      reason: "Unable to verify wallet. Try again later.",
      walletAgeDays: 0,
      txCount: 0,
      signature: null,
      deadline: null,
    });
  }
}
