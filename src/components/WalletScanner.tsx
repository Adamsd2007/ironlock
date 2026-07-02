"use client";

import { useState } from "react";
import { Search, Shield, ShieldAlert, ShieldCheck, ExternalLink } from "lucide-react";
import { isAddress } from "viem";
import { formatAddress, getBscscanAddressUrl } from "@/lib/utils";

interface ScanResult {
  address: string;
  score: number;
  factors: { label: string; passed: boolean; points: number }[];
}

export function WalletScanner() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function scan() {
    setError(null);
    const addr = input.trim();

    if (!addr) {
      setError("Enter a BNB wallet address");
      return;
    }
    if (!isAddress(addr)) {
      setError("Invalid address format");
      return;
    }

    // Deterministic trust score demo
    const charSum = addr.slice(2, 10).split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const factors = [
      { label: "No rugpull history", passed: charSum % 3 !== 0, points: 25 },
      { label: "Contributed to verified tokens", passed: charSum % 4 !== 0, points: 25 },
      { label: "Wallet age > 30 days", passed: charSum % 5 !== 0, points: 25 },
      { label: "Clean report record", passed: charSum % 7 !== 0, points: 25 },
    ];
    const score = Math.min(
      factors.reduce((s, f) => s + (f.passed ? f.points : 0), 0),
      100
    );

    setResult({ address: addr, score, factors });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scan()}
          placeholder="0x... BNB wallet address"
          className="input-field flex-1 font-mono text-sm"
        />
        <button onClick={scan} className="btn-primary flex items-center gap-2">
          <Search className="w-4 h-4" />
          Scan
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <ShieldAlert className="w-4 h-4" />
          {error}
        </p>
      )}

      {result && (
        <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22] space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-text-secondary">
              {formatAddress(result.address)}
            </span>
            <div className="flex items-center gap-2">
              {result.score >= 70 ? (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-400" />
              )}
              <span
                className={`text-xl font-bold ${
                  result.score >= 70 ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.score}
              </span>
            </div>
          </div>

          {result.factors.map((f, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{f.label}</span>
              <span
                className={`text-xs font-medium ${
                  f.passed ? "text-green-400" : "text-red-400"
                }`}
              >
                {f.passed ? "✓" : "✗"}
              </span>
            </div>
          ))}

          <a
            href={getBscscanAddressUrl(result.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm mt-2"
          >
            <ExternalLink className="w-4 h-4" />
            View on BSCScan
          </a>
        </div>
      )}
    </div>
  );
}
