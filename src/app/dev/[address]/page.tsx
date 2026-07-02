"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Shield, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { formatAddress, getBscscanAddressUrl } from "@/lib/utils";

interface DevData {
  walletAge: number;
  txCount: number;
  bnbBalance: string;
  totalLaunches: number;
  successfulLaunches: number;
  refundedLaunches: number;
  reputationScore: number;
  badge: string;
}

export default function DevProfilePage() {
  const params = useParams();
  const address = params?.address as string;
  const [data, setData] = useState<DevData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/dev-reputation?address=${address}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [address]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-12"><div className="card skeleton h-64" /></div>;
  if (!data || data.error) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
      <h1 className="text-xl font-bold text-white">Dev Not Found</h1>
    </div>
  );

  const scoreColor = data.reputationScore >= 80 ? "text-green-400" : data.reputationScore >= 50 ? "text-yellow-400" : "text-red-400";
  const borderColor = data.reputationScore >= 80 ? "border-green-400/30" : data.reputationScore >= 50 ? "border-yellow-400/30" : "border-red-400/30";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className={`card mb-6 ${borderColor}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              👤 Developer Profile
            </h1>
            <p className="text-sm font-mono text-text-secondary mt-1">{address}</p>
            <a href={getBscscanAddressUrl(address)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline mt-1">
              <ExternalLink className="w-3 h-3" /> View on BSCScan
            </a>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-extrabold ${scoreColor}`}>{data.reputationScore}</div>
            <div className="text-xs text-text-muted">Reputation</div>
            <div className="text-sm font-medium mt-1">{data.badge}</div>
          </div>
        </div>

        {data.refundedLaunches > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-400/5 border border-red-400/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-red-400">This developer has had a refund vote pass on a previous token.</span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          ["Wallet Age", `${data.walletAge}d`],
          ["Transactions", String(data.txCount)],
          ["BNB Balance", `${data.bnbBalance} BNB`],
          ["Launches", String(data.totalLaunches)],
        ].map(([l, v], i) => (
          <div key={i} className="card text-center py-3">
            <div className="text-lg font-bold text-white">{v}</div>
            <div className="text-[10px] text-text-muted">{l}</div>
          </div>
        ))}
      </div>

      {/* Launch History */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">Launch History</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-[#0A0A0B]">
            <div className="text-xl font-bold text-white">{data.totalLaunches}</div>
            <div className="text-[10px] text-text-muted">Total</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0B]">
            <div className="text-xl font-bold text-green-400">{data.successfulLaunches}</div>
            <div className="text-[10px] text-text-muted">Successful ✅</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0A0A0B]">
            <div className="text-xl font-bold text-red-400">{data.refundedLaunches}</div>
            <div className="text-[10px] text-text-muted">Refunded ⚠️</div>
          </div>
        </div>
        {data.totalLaunches === 0 && (
          <p className="text-sm text-text-muted text-center mt-4">No launches on IronLock yet.</p>
        )}
      </div>
    </div>
  );
}
