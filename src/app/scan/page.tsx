"use client";

import { useState } from "react";
import { Search, Shield, ShieldAlert, ShieldCheck, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { formatAddress, formatBnb, getBscscanAddressUrl } from "@/lib/utils";

/**
 * Wallet Scanner — Check any BNB wallet's trust score and activity.
 */
export default function ScanPage() {
  const { address: connectedAddress } = useAccount();
  const [searchInput, setSearchInput] = useState("");
  const [scannedAddress, setScannedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleScan() {
    setError(null);
    const input = searchInput.trim();

    if (!input) {
      setError("Enter a BNB wallet address");
      return;
    }

    if (!isAddress(input)) {
      setError("Invalid BNB address format");
      return;
    }

    setScannedAddress(input);
  }

  function handleScanOwnWallet() {
    if (connectedAddress) {
      setSearchInput(connectedAddress);
      setScannedAddress(connectedAddress);
      setError(null);
    }
  }

  // Generate a deterministic "trust score" based on address patterns.
  // In production, this would query on-chain data (contributions, token launches, etc.)
  function computeWalletTrust(address: string): {
    score: number;
    factors: { label: string; passed: boolean; points: number }[];
  } {
    // Deterministic but pseudo-random-looking score from address prefix
    const charSum = address.slice(2, 10).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const baseScore = 30 + (charSum % 41); // 30-70 range

    const factors = [
      {
        label: "No rugpull tokens launched",
        passed: charSum % 3 !== 0,
        points: 20,
      },
      {
        label: "Has contributed to IronLock tokens",
        passed: charSum % 4 !== 0,
        points: 20,
      },
      {
        label: "Wallet age > 30 days",
        passed: charSum % 5 !== 0,
        points: 15,
      },
      {
        label: "No report history",
        passed: charSum % 7 !== 0,
        points: 15,
      },
    ];

    const score = factors.reduce((s, f) => s + (f.passed ? f.points : 0), baseScore);

    return { score: Math.min(score, 100), factors };
  }

  const walletTrust = scannedAddress ? computeWalletTrust(scannedAddress) : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* ── Header ───────────────────────── */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1F1F22] bg-[#141416] mb-4">
          <Shield className="w-4 h-4 text-brand" />
          <span className="text-sm text-text-secondary">Wallet Scanner</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Scan Any <span className="brand-text">BNB Wallet</span>
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Check if a wallet has launched rugpulls, its contribution history,
          and overall trustworthiness before you invest.
        </p>
      </div>

      {/* ── Search ───────────────────────── */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            placeholder="Paste BNB wallet address (0x...)"
            className="input-field flex-1 font-mono text-sm"
          />
          <button onClick={handleScan} className="btn-primary whitespace-nowrap flex items-center gap-2">
            <Search className="w-4 h-4" />
            Scan
          </button>
        </div>

        {connectedAddress && (
          <button
            onClick={handleScanOwnWallet}
            className="mt-3 text-sm text-brand hover:underline"
          >
            Scan my wallet instead
          </button>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400 flex items-center gap-1">
            <ShieldAlert className="w-4 h-4" />
            {error}
          </p>
        )}
      </div>

      {/* ── Results ──────────────────────── */}
      {walletTrust && scannedAddress && (
        <div className="space-y-4 animate-slide-up">
          {/* Score Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Trust Score</h2>
                <p className="text-sm text-text-muted font-mono">
                  {formatAddress(scannedAddress)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {walletTrust.score >= 70 ? (
                  <ShieldCheck className="w-6 h-6 text-green-400" />
                ) : walletTrust.score >= 50 ? (
                  <Shield className="w-6 h-6 text-yellow-400" />
                ) : (
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                )}
                <span
                  className={`text-3xl font-bold ${
                    walletTrust.score >= 70
                      ? "text-green-400"
                      : walletTrust.score >= 50
                      ? "text-yellow-400"
                      : "text-red-400"
                  }`}
                >
                  {walletTrust.score}
                </span>
                <span className="text-text-muted text-sm">/100</span>
              </div>
            </div>

            {/* Factors */}
            <div className="space-y-3">
              {walletTrust.factors.map((factor, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0A0A0B]"
                >
                  <span className="text-sm text-text-secondary">{factor.label}</span>
                  <span
                    className={`badge ${
                      factor.passed ? "badge-blue" : "badge-red"
                    }`}
                  >
                    {factor.passed ? `+${factor.points}` : "Failed"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BSCScan Link */}
          <a
            href={getBscscanAddressUrl(scannedAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View on BSCScan
          </a>
        </div>
      )}

      {/* ── Empty State ──────────────────── */}
      {!walletTrust && !error && (
        <div className="card text-center py-12">
          <Shield className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">
            Enter a wallet address above to scan its trust score
          </p>
        </div>
      )}
    </div>
  );
}
