"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { formatAddress, getBscscanAddressUrl } from "@/lib/utils";

interface DevData {
  address: string;
  reputationScore: number;
  badge: string;
  totalLaunches: number;
  successfulLaunches: number;
  refundedLaunches: number;
  walletAge: number;
  txCount: number;
  error?: string;
}

export default function DevProfilePage() {
  const params = useParams();
  const address = params?.address as string;
  const [data, setData] = useState<DevData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    async function fetchDevData() {
      try {
        const res = await fetch(`/api/dev-reputation?address=${address}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        setData({ 
          address, 
          reputationScore: 0, 
          badge: "Unknown",
          totalLaunches: 0,
          successfulLaunches: 0,
          refundedLaunches: 0,
          walletAge: 0,
          txCount: 0,
          error: "Failed to load developer data"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDevData();
  }, [address]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="card skeleton h-64" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white">Dev Not Found</h1>
        <p className="text-text-secondary">No developer data available for this address.</p>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white">Error Loading Data</h1>
        <p className="text-text-secondary">{data.error}</p>
      </div>
    );
  }

  const scoreColor = data.reputationScore >= 80 
    ? "text-green-400" 
    : data.reputationScore >= 50 
    ? "text-yellow-400" 
    : "text-red-400";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Developer Profile</h1>
          <a 
            href={getBscscanAddressUrl(address)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary text-sm flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> BSCScan
          </a>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center text-2xl">
            {data.badge === "Trusted" ? "🛡️" : data.badge === "New" ? "🌱" : "⚠️"}
          </div>
          <div>
            <p className="text-sm text-text-muted">Developer</p>
            <p className="text-lg font-mono text-white">{formatAddress(address)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-[#0A0A0B] text-center">
            <div className={`text-2xl font-bold ${scoreColor}`}>{data.reputationScore}</div>
            <div className="text-xs text-text-muted">Reputation Score</div>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0B] text-center">
            <div className="text-2xl font-bold text-white">{data.totalLaunches}</div>
            <div className="text-xs text-text-muted">Total Launches</div>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0B] text-center">
            <div className="text-2xl font-bold text-green-400">{data.successfulLaunches}</div>
            <div className="text-xs text-text-muted">Successful</div>
          </div>
          <div className="p-4 rounded-lg bg-[#0A0A0B] text-center">
            <div className="text-2xl font-bold text-red-400">{data.refundedLaunches}</div>
            <div className="text-xs text-text-muted">Refunded</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[#0A0A0B]">
            <p className="text-xs text-text-muted">Wallet Age</p>
            <p className="text-sm font-semibold text-white">{data.walletAge} days</p>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0B]">
            <p className="text-xs text-text-muted">Transaction Count</p>
            <p className="text-sm font-semibold text-white">{data.txCount.toLocaleString()}</p>
          </div>
        </div>

        {data.refundedLaunches > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-red-400/5 border border-red-400/20">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400 font-medium">
                ⚠️ This developer has had {data.refundedLaunches} refund vote(s) pass
              </p>
            </div>
            <p className="text-xs text-red-400/70 mt-1">
              Invest in their tokens with caution.
            </p>
          </div>
        )}

        {data.refundedLaunches === 0 && data.totalLaunches > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-green-400/5 border border-green-400/20">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-sm text-green-400 font-medium">
                ✅ Clean record — no refund votes on any launches
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}