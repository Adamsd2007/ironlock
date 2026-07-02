import { NextRequest, NextResponse } from "next/server";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9";
const BSC_RPC = process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const BSCSCAN_API_URL = "https://api.bscscan.com/api";

// ── RPC call helper ──────────────────────
async function rpcCall(method: string, params: any[]): Promise<any> {
  const res = await fetch(BSC_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

// ── Call contract view functions ─────────
async function getDevStats(wallet: string) {
  // getDevStats(address) returns (total, successful, refunded)
  const callData = "0x" +
    "7d4e3b5d" + // getDevStats selector
    wallet.toLowerCase().padStart(64, "0").slice(2);

  const result = await rpcCall("eth_call", [{
    to: FACTORY_ADDRESS, data: callData,
  }, "latest"]);

  if (!result || result === "0x") return { total: 0, successful: 0, refunded: 0 };
  const decoded = Buffer.from(result.slice(2), "hex");
  const total = Number("0x" + decoded.subarray(0, 32).toString("hex"));
  const successful = Number("0x" + decoded.subarray(32, 64).toString("hex"));
  const refunded = Number("0x" + decoded.subarray(64, 96).toString("hex"));
  return { total, successful, refunded };
}

// ── Fetch BSCScan data ──────────────────
async function getWalletData(wallet: string) {
  const apiKeyParam = BSCSCAN_API_KEY ? `&apikey=${BSCSCAN_API_KEY}` : "";
  const url = `${BSCSCAN_API_URL}?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&page=1&offset=50&sort=asc${apiKeyParam}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  const data = await res.json();
  const txs = data.status === "1" && Array.isArray(data.result) ? data.result : [];

  const balance = await rpcCall("eth_getBalance", [wallet, "latest"]);
  const bnbBalance = parseInt(balance || "0x0", 16) / 1e18;

  let walletAgeDays = 0;
  if (txs.length > 0) {
    walletAgeDays = Math.floor((Date.now() / 1000 - parseInt(txs[0].timeStamp, 10)) / 86400);
  }

  return { txCount: txs.length, walletAgeDays, bnbBalance: bnbBalance.toFixed(4) };
}

// ── Reputation scoring ──────────────────
function calculateScore(
  successful: number, refunded: number, walletAgeDays: number, txCount: number
): { score: number; badge: string } {
  let score = 50;
  score += successful * 15;
  score -= refunded * 30;
  if (walletAgeDays > 365) score += 10;
  if (walletAgeDays > 730) score += 10;
  if (txCount > 100) score += 5;
  if (txCount > 500) score += 5;
  score = Math.max(0, Math.min(100, score));

  let badge: string;
  if (refunded > 0) badge = "⚠️ Refund History";
  else if (successful >= 3) badge = "🏆 Trusted Developer";
  else if (successful >= 1) badge = "✅ Verified Builder";
  else badge = "🆕 First Launch";

  return { score, badge };
}

// ── GET handler ──────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("address");

  if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const [stats, walletData] = await Promise.all([
      getDevStats(wallet).catch(() => ({ total: 0, successful: 0, refunded: 0 })),
      getWalletData(wallet).catch(() => ({ txCount: 0, walletAgeDays: 0, bnbBalance: "0" })),
    ]);

    const { score, badge } = calculateScore(stats.successful, stats.refunded, walletData.walletAgeDays, walletData.txCount);

    return NextResponse.json({
      walletAge: walletData.walletAgeDays,
      txCount: walletData.txCount,
      bnbBalance: walletData.bnbBalance,
      totalLaunches: stats.total,
      successfulLaunches: stats.successful,
      refundedLaunches: stats.refunded,
      reputationScore: score,
      badge,
    });
  } catch (err: any) {
    console.error("[DevReputation] Error:", err.message);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
