/**
 * IronLock.xyz — Utility Functions
 */

import { formatEther, type Address } from "viem";

// ── Formatting ───────────────────────────
export function formatBnb(wei: bigint | string): string {
  const value = typeof wei === "string" ? wei : formatEther(wei);
  const num = parseFloat(value);
  if (num >= 1000) return num.toFixed(2) + " BNB";
  if (num >= 1) return num.toFixed(4) + " BNB";
  if (num >= 0.001) return num.toFixed(6) + " BNB";
  return num.toFixed(8) + " BNB";
}

export function formatTokens(wei: bigint | string): string {
  const value = typeof wei === "string" ? wei : formatEther(wei);
  const num = parseFloat(value);
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}

export function formatPercent(bps: number): string {
  return (bps / 100).toFixed(1) + "%";
}

export function formatDate(timestamp: bigint | number): string {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function daysUntil(timestamp: bigint | number): number {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil((ts - now) / 86400));
}

export function daysSince(timestamp: bigint | number): number {
  const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil((now - ts) / 86400));
}

export function formatTimeSinceLaunch(launchTimestamp: bigint | number): string {
  // Contract timestamps are in SECONDS, convert to ms
  const launchMs = Number(launchTimestamp) * 1000;
  const nowMs = Date.now();
  const diffMs = nowMs - launchMs;

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Show granular time for recent launches
  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return diffMinutes + "m ago";
  if (diffHours < 24) return diffHours + "h ago";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 30) return diffDays + "d ago";

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return diffMonths + "mo ago";

  const diffYears = Math.floor(diffDays / 365);
  return diffYears + "y ago";
}

// ── Safety Score ─────────────────────────
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  return "text-red-400";
}

export function getScoreLabel(score: number): string {
  if (score === 100) return "Maximum Safety ⭐";
  if (score >= 80) return "High Trust";
  if (score >= 60) return "Moderate Trust";
  if (score >= 40) return "Low Trust";
  return "Risky";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-400/10 border-green-400/20";
  if (score >= 60) return "bg-yellow-400/10 border-yellow-400/20";
  return "bg-red-400/10 border-red-400/20";
}

// ── Validation ───────────────────────────
export function validateTokenName(name: string): string | null {
  if (!name.trim()) return "Token name is required";
  if (name.length < 2) return "Name must be at least 2 characters";
  if (name.length > 50) return "Name must be under 50 characters";
  return null;
}

export function validateSymbol(symbol: string): string | null {
  if (!symbol.trim()) return "Symbol is required";
  if (symbol.length < 2) return "Symbol must be at least 2 characters";
  if (symbol.length > 10) return "Symbol must be under 10 characters";
  if (!/^[A-Za-z0-9]+$/.test(symbol)) return "Symbol must be alphanumeric";
  return null;
}

export function validateSupply(supply: string): string | null {
  const num = parseFloat(supply);
  if (isNaN(num) || num <= 0) return "Supply must be a positive number";
  if (num > 1_000_000_000_000) return "Supply must be under 1 trillion";
  return null;
}

export function validateRaiseCap(cap: string): string | null {
  const num = parseFloat(cap);
  if (isNaN(num) || num <= 0) return "Raise cap must be a positive number";
  if (num > 10_000) return "Raise cap max is 10,000 BNB";
  return null;
}

// ── BSCScan Links ────────────────────────
export function getBscscanTxUrl(txHash: string): string {
  const base = process.env.NEXT_PUBLIC_BSCSCAN_URL || "https://bscscan.com";
  return `${base}/tx/${txHash}`;
}

export function getBscscanAddressUrl(address: string): string {
  const base = process.env.NEXT_PUBLIC_BSCSCAN_URL || "https://bscscan.com";
  return `${base}/address/${address}`;
}

export function getBscscanTokenUrl(address: string): string {
  const base = process.env.NEXT_PUBLIC_BSCSCAN_URL || "https://bscscan.com";
  return `${base}/token/${address}`;
}

// ── Anti-Snipe Status ────────────────────
export function isAntiSnipeActive(antiSnipeEnd: bigint): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return now < antiSnipeEnd;
}

export function antiSnipeSecondsLeft(antiSnipeEnd: bigint): number {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (now >= antiSnipeEnd) return 0;
  return Number(antiSnipeEnd - now);
}
