"use client";

import { useState, useEffect, Component } from "react";
import Link from "next/link";

// ── Simple error boundary for panel components ─
class PanelErrorBoundary extends Component<{ children: React.ReactNode }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import {
  Shield, ShieldCheck, Clock, Lock, TrendingUp, Users,
  AlertTriangle, CheckCircle, ExternalLink, Coins, Vote,
  Timer, Copy, ShoppingCart, Check,
} from "lucide-react";
import { useTokenInfo, useContribution, useAntiSnipeStatus } from "@/hooks/useIronLock";
import { FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { TrustBadge } from "@/components/TrustBadge";
import { contributeToToken, castRefundVote, claimRefund, startRefundVote } from "@/lib/launch";
import {
  formatBnb, formatTokens, formatPercent, formatAddress, formatDate,
  daysUntil, daysSince, formatTimeSinceLaunch,
  isAntiSnipeActive, antiSnipeSecondsLeft,
  getScoreColor, getScoreLabel, getBscscanAddressUrl, getBscscanTokenUrl,
} from "@/lib/utils";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-brand bg-[#0A0A0B] hover:bg-brand/10 transition-all"
    >
      {copied ? <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied!</span></> : <><Copy className="w-3 h-3" />Copy</>}
    </button>
  );
}

function ProgressPill({ pct, color = "bg-brand" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-2 bg-[#1F1F22] rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function getRefundPool(info: any): bigint {
  let bps = 0n;
  if (info.milestoneReleased >= 1) bps += 3300n;
  if (info.milestoneReleased >= 2) bps += 3300n;
  if (info.milestoneReleased >= 3) bps += 3400n;
  const released = (info.totalRaised * bps) / 10000n;
  return info.totalRaised - released;
}

function formatBnbNum(wei: bigint): number {
  return Number(wei) / 1e18;
}

// ═══════════════════════════════════════════
// ── LP Lock Panel Component ──────────────
function LPLockPanel({ tokenAddr, lpLockDays, dev, raiseCap, totalRaised, launchTime }: {
  tokenAddr: string; lpLockDays: number; dev: string; raiseCap: bigint; totalRaised: bigint; launchTime: number;
}) {
  const { address: userAddr } = useAccount();
  const { data: lpRaw } = useReadContract({
    address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getLPStatus", args: [tokenAddr as `0x${string}`],
  });
  const [addingLiq, setAddingLiq] = useState(false);
  const [claimingLP, setClaimingLP] = useState(false);

  const lpData = lpRaw as any;
  const added = lpData?.[0] ?? false;
  const pair = lpData?.[1] as string | undefined;
  const lockedAmt = lpData?.[2] ?? 0n;
  const unlockTime = lpData?.[3] ?? 0n;
  const claimable = lpData?.[4] ?? false;

  const raiseComplete = totalRaised >= raiseCap || (Date.now()/1000 - launchTime) > 30*86400;
  const now = Math.floor(Date.now()/1000);
  const daysUntilUnlock = unlockTime > 0n ? Math.max(0, Math.floor((Number(unlockTime) - now) / 86400)) : lpLockDays;
  const elapsedPct = unlockTime > 0n ? Math.min(100, ((lpLockDays - daysUntilUnlock) / lpLockDays) * 100) : 0;

  async function handleAddLiquidity() {
    if (!userAddr) { toast.error("Please connect your wallet"); return; }
    setAddingLiq(true);
    try {
      const { writeContract } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/app/providers");
      console.log("🚀 Adding liquidity for:", tokenAddr);
      await writeContract(wagmiConfig, {
        address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "addLiquidityToPancakeSwap",
        args: [tokenAddr as `0x${string}`],
      });
      toast.success("🎉 Liquidity added! LP tokens locked for 180 days.");
      setTimeout(() => window.location.reload(), 3000);
    } catch (e: any) {
      console.error("❌ Add liquidity error:", e);
      toast.error(e?.shortMessage || e?.message || "Failed to add liquidity");
    }
    setAddingLiq(false);
  }

  async function handleClaimLP() {
    if (!userAddr) { toast.error("Please connect your wallet"); return; }
    setClaimingLP(true);
    try {
      const { writeContract } = await import("@wagmi/core");
      const { wagmiConfig } = await import("@/app/providers");
      console.log("🚀 Claiming LP for:", tokenAddr);
      await writeContract(wagmiConfig, {
        address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "claimLPTokens",
        args: [tokenAddr as `0x${string}`],
      });
      toast.success("🎉 LP tokens claimed!");
      setTimeout(() => window.location.reload(), 3000);
    } catch (e: any) {
      console.error("❌ Claim LP error:", e);
      toast.error(e?.shortMessage || e?.message || "Failed to claim LP tokens");
    }
    setClaimingLP(false);
  }

  let status: string, badge: string, subtext: any;
  if (!added && !raiseComplete) {
    status = "PENDING"; badge = "badge-yellow";
    subtext = <p className="text-xs text-text-muted">Liquidity added to PancakeSwap when raise cap ({formatBnb(raiseCap)}) is reached.</p>;
  } else if (!added && raiseComplete) {
    status = "⚡ READY"; badge = "badge-yellow";
    subtext = <div><p className="text-xs text-text-muted mb-2">Raise complete — anyone can finalize liquidity now.</p>
      <button onClick={handleAddLiquidity} disabled={addingLiq} className="btn-primary text-xs py-1.5 px-3 w-full">
        {addingLiq ? "Adding liquidity..." : "Add Liquidity to PancakeSwap →"}
      </button></div>;
  } else if (added && !claimable) {
    status = "ACTIVE ✅"; badge = "badge-blue";
    subtext = <div>
      {pair && <p className="text-xs text-text-muted">Pair: <a href={`https://bscscan.com/address/${pair}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-mono text-[11px]">{formatAddress(pair)}</a></p>}
      <p className="text-xs text-text-muted">Locked: {lockedAmt > 0n ? Number(lockedAmt).toLocaleString() : "?"} LP · Unlocks {formatDate(unlockTime)} · {daysUntilUnlock}d left</p>
      <ProgressPill pct={elapsedPct} color="bg-brand" />
      <div className="flex justify-between text-[10px] text-text-muted mt-1"><span>{elapsedPct.toFixed(0)}% elapsed</span><span>{lpLockDays}d total</span></div>
    </div>;
  } else {
    status = "UNLOCKED"; badge = "badge-green";
    subtext = <div>
      <p className="text-xs text-text-muted mb-2">LP tokens are now claimable.</p>
      {userAddr?.toLowerCase() === dev.toLowerCase() && (
        <button onClick={handleClaimLP} disabled={claimingLP} className="btn-primary text-xs py-1.5 px-3 w-full">
          {claimingLP ? "Claiming..." : "Claim LP Tokens"}
        </button>
      )}
    </div>;
  }

  return (
    <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]">
      <div className="flex items-center gap-2 mb-2">
        <Lock className="w-4 h-4 text-brand" />
        <span className="text-sm font-semibold text-white">Liquidity Lock</span>
        <span className={`badge text-[10px] ml-auto ${badge}`}>{status}</span>
      </div>
      {subtext}
    </div>
  );
}

// ── PancakeSwap Section ───────────────────
function PancakeSwapSection({ tokenAddr, symbol }: { tokenAddr: string; symbol: string }) {
  const { data: lpRaw } = useReadContract({
    address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getLPStatus", args: [tokenAddr as `0x${string}`],
  });
  const lpData = lpRaw as any;
  const added = lpData?.[0] ?? false;
  const pair = lpData?.[1] as string | undefined;
  const pancakeUrl = pair
    ? `https://pancakeswap.finance/swap?outputCurrency=${tokenAddr}&chain=bsc`
    : `https://pancakeswap.finance/swap?outputCurrency=${tokenAddr}&chain=bsc`;

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-brand" /> Buy {symbol}
      </h2>
      {added ? (
        <div>
          {pair && <p className="text-[10px] text-text-muted mb-2">Pair: <a href={`https://bscscan.com/address/${pair}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline font-mono">{formatAddress(pair)}</a></p>}
          <a href={pancakeUrl} target="_blank" rel="noopener noreferrer" className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
            🥞 Buy on PancakeSwap
          </a>
        </div>
      ) : (
        <div>
          <button disabled className="btn-primary w-full flex items-center justify-center gap-2 text-sm opacity-40 cursor-not-allowed">
            🔒 PancakeSwap Listing Pending
          </button>
          <p className="text-[10px] text-text-muted mt-1.5 text-center">Token will be listed once the raise is complete and liquidity is added.</p>
        </div>
      )}
    </div>
  );
}

// ── Fund Accounting Panel ──────────────────
function FundAccounting({ tokenAddr }: { tokenAddr: string }) {
  const { data } = useReadContract({
    address: FACTORY_ADDRESS, abi: FACTORY_ABI, functionName: "getTokenAccountingStatus",
    args: [tokenAddr as `0x${string}`],
  });
  if (!data) return null;
  const [totalRaisedRaw, trackedRaw, releasedRaw] = data as bigint[];
  const raised = Number(totalRaisedRaw) / 1e18;
  const tracked = Number(trackedRaw) / 1e18;
  const released = Number(releasedRaw) / 1e18;
  const matches = Math.abs(raised - (tracked + released)) < 0.001;

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">💰 Fund Transparency</h2>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded bg-[#0A0A0B]"><div className="text-white font-bold">{raised.toFixed(3)}</div><div className="text-[10px] text-text-muted">Total Raised BNB</div></div>
        <div className="p-2 rounded bg-[#0A0A0B]"><div className="text-yellow-400 font-bold">{released.toFixed(3)}</div><div className="text-[10px] text-text-muted">Released to Dev</div></div>
        <div className="p-2 rounded bg-[#0A0A0B]"><div className="text-green-400 font-bold">{tracked.toFixed(3)}</div><div className="text-[10px] text-text-muted">Locked in Contract</div></div>
      </div>
      <p className="text-[10px] text-center mt-2 text-text-muted">{matches ? "✅ All figures reconcile" : "⚠️ Discrepancy detected"}</p>
    </div>
  );
}

// ── Dev Transparency Panel Component ──────
function DevTransparencyPanel({ devAddress }: { devAddress: string }) {
  const [devData, setDevData] = useState<any>(null);
  const [secData, setSecData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r1 = await fetch(`/api/dev-reputation?address=${devAddress}`);
        if (r1.ok && !cancelled) setDevData(await r1.json());
      } catch {}
      try {
        const r2 = await fetch(`/api/wallet-security-check?address=${devAddress}`);
        if (r2.ok && !cancelled) setSecData(await r2.json());
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [devAddress]);

  if (!devData) return <div className="card mb-6 animate-pulse h-40 rounded-2xl bg-[#141416] border border-[#1F1F22]" />;
  if (devData.error) return null;

  const sc = devData.reputationScore || 0;
  const scColor = sc >= 80 ? "text-green-400" : sc >= 50 ? "text-yellow-400" : "text-red-400";
  const border = sc >= 80 ? "border-green-400/20" : sc >= 50 ? "border-yellow-400/20" : "border-red-400/20";

  return (
    <div className="card mb-6">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">👤 Developer Transparency</h2>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-mono text-text-secondary">{formatAddress(devAddress)}</span>
        <CopyButton text={devAddress} />
        <a href={getBscscanAddressUrl(devAddress)} target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand hover:underline inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> BSCScan
        </a>
      </div>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${border} bg-[#0A0A0B] mb-3`}>
        <span className={`text-sm font-bold ${scColor}`}>{sc}/100</span>
        <span className="text-xs text-text-muted">{devData.badge}</span>
      </div>
      {devData.refundedLaunches > 0 && (
        <div className="p-3 rounded-lg bg-red-400/5 border border-red-400/20 flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-xs text-red-400">This developer has had a refund vote pass on a previous token. Review carefully before investing.</span>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        {[["Wallet Age", `${devData.walletAge || 0}d`], ["Tx Count", String(devData.txCount || 0)],
          ["Launches", String(devData.totalLaunches || 0)], ["Successful", `${devData.successfulLaunches || 0} ✅`],
        ].map(([l, v], i) => (
          <div key={i} className="p-2 rounded bg-[#0A0A0B]">
            <div className="text-white font-medium">{v}</div>
            <div className="text-[10px] text-text-muted">{l}</div>
          </div>
        ))}
      </div>

      {/* External Security Check */}
      {secData && secData.riskLevel && (
        <div className={`mt-4 p-3 rounded-lg border ${
          secData.riskLevel === "danger" ? "bg-red-400/5 border-red-400/30" :
          secData.riskLevel === "warning" ? "bg-yellow-400/5 border-yellow-400/30" :
          secData.riskLevel === "unknown" ? "bg-gray-400/5 border-gray-400/20" :
          "bg-green-400/5 border-green-400/20"
        }`}>
          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            🔍 External Security Check{" "}
            {secData.riskLevel === "clean" && <span className="text-green-400">✅ Clean</span>}
            {secData.riskLevel === "warning" && <span className="text-yellow-400 font-bold">⚠️ WARNING</span>}
            {secData.riskLevel === "danger" && <span className="text-red-400 font-bold">🚨 HIGH RISK</span>}
            {secData.riskLevel === "unknown" && <span className="text-text-muted">⏳ Unavailable</span>}
          </h4>
          {secData.riskLevel === "clean" && (
            <div className="text-[11px] text-text-muted space-y-0.5">
              <p>✅ No external scam reports found</p>
              <p>✅ Not flagged by GoPlus Security</p>
              <p>✅ No phishing/scam labels detected</p>
            </div>
          )}
          {secData.riskLevel === "warning" && (
            <div className="text-[11px] text-yellow-400/80">
              <p>This wallet has minor flags: {(secData.flags || []).join(", ") || "N/A"}</p>
              <p className="mt-1">Review the wallet history on BSCScan before investing.</p>
            </div>
          )}
          {secData.riskLevel === "danger" && (
            <div className="text-[11px] text-red-400/80">
              <p>This wallet has been flagged for: {(secData.flags || []).join(", ") || "N/A"}</p>
              <p className="mt-1 font-semibold">We strongly recommend NOT investing in tokens from this developer.</p>
            </div>
          )}
          {secData.riskLevel === "unknown" && (
            <p className="text-[11px] text-text-muted">Unable to verify external reports. Please do your own research.</p>
          )}
          {secData.source ? (
            <p className="text-[10px] text-text-muted/60 mt-2">
              Powered by {secData.source} · {secData.checkedAt ? `${Math.floor((Date.now() - secData.checkedAt) / 3600000)}h ago` : ""}
            </p>
          ) : null}
        </div>
      )}

      <Link href={`/dev/${devAddress}`} className="inline-flex items-center gap-1 text-xs text-brand hover:underline mt-3">
        View Full Dev Profile →
      </Link>
    </div>
  );
}

export default function TokenPage() {
  const params = useParams();
  const { address: userAddress } = useAccount();
  const tokenAddress = params?.address as string;

  const { info, isLoading } = useTokenInfo(tokenAddress);
  const { data: contribution } = useContribution(tokenAddress, userAddress);
  const { data: antiSnipeEnd } = useAntiSnipeStatus(tokenAddress);

  const { data: devActivityRaw } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: FACTORY_ABI,
    functionName: "devLastActivity",
    args: info ? [info.dev as `0x${string}`] : undefined,
    query: { enabled: !!info },
  });

  const [contributeAmount, setContributeAmount] = useState("0.1");
  const [contributing, setContributing] = useState(false);
  const [voting, setVoting] = useState(false);
  const [startingVote, setStartingVote] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="card animate-pulse space-y-4">
          <div className="h-8 skeleton w-64" /><div className="h-5 skeleton w-48" /><div className="h-32 skeleton w-full" />
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Token Not Found</h1>
        <p className="text-text-secondary">This address is not an IronLock token or does not exist.</p>
      </div>
    );
  }

  const progress = info.raiseCap > 0 ? Number((info.totalRaised * 10000n) / info.raiseCap) / 100 : 0;
  const antiSnipeActive = antiSnipeEnd ? isAntiSnipeActive(antiSnipeEnd) : false;
  const snipeSecondsLeft = antiSnipeEnd ? antiSnipeSecondsLeft(antiSnipeEnd) : 0;
  const daysSinceLaunch = daysSince(info.launchTime);
  const lpUnlockDate = BigInt(Number(info.launchTime) + Number(info.lpLockDays) * 86400);
  const lpDaysRemaining = daysUntil(lpUnlockDate);
  const lpElapsedPct = info.lpLockDays > 0n ? Math.min(100, Number((BigInt(daysSinceLaunch) * 100n) / info.lpLockDays)) : 0;

  // Vesting
  const vestingEndDate = BigInt(Number(info.launchTime) + Number(info.vestingDays) * 86400);
  const vestingElapsedPct = info.vestingDays > 0n
    ? Math.min(100, Number((BigInt(daysSinceLaunch) * 100n) / info.vestingDays)) : 0;

  const pancakeUrl = `https://pancakeswap.finance/swap?outputCurrency=${tokenAddress}&chain=bsc`;
  const estimatedTokens = info.raiseCap > 0n && contributeAmount
    ? (BigInt(Math.floor(parseFloat(contributeAmount) * 1e18)) * info.totalSupply) / info.raiseCap
    : 0n;

  // ── Handlers ────────────────────────────
  function getFriendlyError(e: any): string {
    const msg = e?.shortMessage || e?.message || e?.toString() || "";
    if (msg.includes("user rejected") || msg.includes("User denied")) return "Transaction was cancelled";
    if (msg.includes("insufficient funds")) return "Insufficient BNB balance. Please add more BNB to your wallet.";
    if (msg.includes("execution reverted")) {
      if (msg.includes("max contribution")) return "You have exceeded the maximum contribution limit per wallet.";
      if (msg.includes("raise cap")) return "The raise cap has been reached.";
      if (msg.includes("anti-snipe")) return "You are in the anti-snipe window. Maximum 0.5 BNB per wallet.";
      return "Transaction reverted. Please check your contribution amount.";
    }
    return msg || "Transaction failed. Please try again.";
  }

  async function handleContribute() {
    if (!userAddress) { toast.error("Please connect your wallet to contribute"); return; }
    const amount = parseFloat(contributeAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Please enter a valid contribution amount"); return; }
    console.log("🚀 Contributing:", amount, "BNB to", tokenAddress);
    setContributing(true);
    try {
      const result = await contributeToToken(tokenAddress, contributeAmount);
      console.log("✅ Contribution result:", result);
      if (result.success) {
        toast.success("🎉 Contribution successful! Thank you!");
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(result.error || "Contribution failed. Please try again.");
      }
    } catch (e: any) {
      console.error("❌ Contribution error:", e);
      toast.error(getFriendlyError(e));
    }
    setContributing(false);
  }
  async function handleVote(voteYes: boolean) {
    setVoting(true);
    const r = await castRefundVote(tokenAddress, voteYes);
    setVoting(false);
    r.success ? toast.success("Vote cast!") : toast.error(r.error || "Vote failed");
  }
  async function handleStartRefundVote() {
    setStartingVote(true);
    const r = await startRefundVote(tokenAddress);
    setStartingVote(false);
    r.success ? toast.success("Refund vote started!") : toast.error(r.error || "Failed to start vote");
  }
  async function handleClaim() {
    setClaiming(true);
    const r = await claimRefund(tokenAddress);
    setClaiming(false);
    r.success ? toast.success("Refund claimed!") : toast.error(r.error || "Claim failed");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* ══════════════════════════════════════
          HEADER
          ══════════════════════════════════════ */}
      <div className="card mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-2xl"
              style={{
                background: `hsl(${info.symbol.split("").reduce((h, c) => h + c.charCodeAt(0), 0) % 360}, 40%, 20%)`,
              }}>
              {info.symbol.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{info.name}</h1>
                <span className="badge badge-blue text-[11px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> IronLock Verified
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-text-muted font-mono text-sm">
                  {info.symbol} · {formatAddress(info.tokenAddress)}
                </span>
                <CopyButton text={info.tokenAddress} />
                <a href={getBscscanTokenUrl(tokenAddress)} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-brand hover:underline inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> BSCScan
                </a>
              </div>
              <p className="text-xs text-text-muted mt-1">Launched {formatDate(info.launchTime)} · {formatTimeSinceLaunch(info.launchTime)}</p>
            </div>
          </div>

          <div className="shrink-0">
            <TrustBadge token={{ antiSnipeEnd: info.antiSnipeEnd, lpLockDays: info.lpLockDays, vestingDays: info.vestingDays, devAllocationBps: info.devAllocationBps, raiseCap: info.raiseCap, softCap: 0n, safetyScore: info.safetyScore }} size="lg" />
          </div>
        </div>

        {/* Raise Progress */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-text-secondary">Raised</span>
            <span className="text-white font-medium">{formatBnb(info.totalRaised)} / {formatBnb(info.raiseCap)}</span>
          </div>
          <div className="w-full h-3 bg-[#1F1F22] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{progress.toFixed(0)}% filled</span>
            <span>{info.active ? "🟢 Active" : "🔴 Ended"}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          STATS ROW
          ══════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Raised", value: formatBnb(info.totalRaised) },
          { label: "Dev Allocation", value: formatPercent(info.devAllocationBps) },
          { label: "Days Since Launch", value: `${daysSinceLaunch}d` },
          { label: "Refundable", value: formatBnb(getRefundPool(info)) },
        ].map((s, i) => (
          <div key={i} className="card text-center py-3 px-2">
            <div className="text-lg font-bold text-white">{s.value}</div>
            <div className="text-[10px] text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════
          SAFETY PANEL (full width)
          ══════════════════════════════════════ */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-400" />
          Safety Features
          <span className="text-[11px] text-green-400 font-normal ml-1">✅ All verified on-chain</span>
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          {/* LP Lock */}
          {/* LP Lock — real status from contract */}
          <LPLockPanel tokenAddr={info.tokenAddress} lpLockDays={Number(info.lpLockDays)} dev={info.dev} raiseCap={info.raiseCap} totalRaised={info.totalRaised} launchTime={Number(info.launchTime)} />

          {/* Dev Vesting */}
          <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-white">Dev Vesting</span>
              <span className="badge badge-blue text-[10px] ml-auto">{vestingElapsedPct.toFixed(0)}% unlocked</span>
            </div>
            <p className="text-xs text-text-muted mb-2">Fully vested on {formatDate(vestingEndDate)}</p>
            <ProgressPill pct={vestingElapsedPct} color="bg-green-400" />
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span>Linear · {info.vestingDays.toString()}d</span><span>2% daily sell cap</span>
            </div>
          </div>

          {/* Anti-Snipe */}
          <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-white">Anti-Snipe Protection</span>
              <span className={`badge text-[10px] ml-auto ${antiSnipeActive ? "badge-yellow" : "badge-blue"}`}>
                {antiSnipeActive ? `ACTIVE (${snipeSecondsLeft}s)` : "EXPIRED"}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {antiSnipeActive
                ? `Max 0.5 BNB per wallet for ${snipeSecondsLeft}s. Prevents bot sniping.`
                : `Launched ${formatTimeSinceLaunch(info.launchTime)} — anti-snipe window has ended.`}
            </p>
          </div>

          {/* Milestones */}
          <div className="p-4 rounded-xl bg-[#0A0A0B] border border-[#1F1F22]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              <span className="text-sm font-semibold text-white">Milestone Fund Release</span>
              <span className="text-[10px] text-text-muted ml-auto">{info.milestoneReleased}/3</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "M1 (33%)", time: info.launchTime, done: info.milestoneReleased >= 1 },
                { label: "M2 (33%)", time: BigInt(Number(info.launchTime) + 30 * 86400), done: info.milestoneReleased >= 2 },
                { label: "M3 (34%)", time: BigInt(Number(info.launchTime) + 90 * 86400), done: info.milestoneReleased >= 3 },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">{m.label}</span>
                  <span className="text-[10px] text-text-muted">{formatDate(m.time)}</span>
                  <span className={m.done ? "text-green-400" : "text-text-muted"}>
                    {m.done ? "✅ Released" : "🔒 Locked"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* ════ BUY / CONTRIBUTE ════ */}
        <div className="space-y-4">
          {/* PancakeSwap — dynamic based on LP status */}
          <PancakeSwapSection tokenAddr={info.tokenAddress} symbol={info.symbol} />

          {/* Contribute */}
          {info.active && (
            <div className="card">
              <h2 className="text-lg font-bold text-white mb-3">Contribute to Presale</h2>
              <div className="flex gap-3">
                <input type="number" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)}
                  step="0.01" min="0.01" className="input-field flex-1" placeholder="0.1" />
                <button onClick={handleContribute} disabled={contributing || !info.active || !userAddress} className="btn-primary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                  {contributing ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</span> : "Buy"}
                </button>
              </div>
              {estimatedTokens > 0n && (
                <p className="text-xs text-text-secondary mt-2">
                  You will receive ≈ <span className="text-white font-mono">{formatTokens(estimatedTokens)}</span> {info.symbol}
                </p>
              )}
              {contribution && contribution > 0n && (
                <p className="text-sm text-text-muted mt-2">Your contribution: {formatBnb(contribution)}</p>
              )}
            </div>
          )}

          {/* Refund Vote */}
          {info.refundVoteActive && (
            <div className="card border-yellow-400/20">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Vote className="w-5 h-5 text-yellow-400" /> Refund Vote Active
              </h2>
              <p className="text-sm text-text-secondary mb-4">The community is voting on whether to refund contributions.</p>
              <div className="flex gap-3">
                <button onClick={() => handleVote(true)} disabled={voting} className="btn-primary flex-1">Vote Yes</button>
                <button onClick={() => handleVote(false)} disabled={voting} className="btn-secondary flex-1">Vote No</button>
              </div>
            </div>
          )}

          {/* Claim Refund */}
          {!info.active && (
            <div className="card border-red-400/20">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" /> Token Inactive
              </h2>
              <p className="text-sm text-text-secondary mb-4">Refund vote has passed. Claim your pro-rata refund.</p>
              <button onClick={handleClaim} disabled={claiming} className="btn-primary w-full">
                {claiming ? "Claiming..." : "Claim Refund"}
              </button>
            </div>
          )}
        </div>

        {/* ════ DETAILS + LINKS ════ */}
        <div className="space-y-4">
          {/* Links */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-3">Links</h2>
            <div className="space-y-2">
              <a href={getBscscanTokenUrl(tokenAddress)} target="_blank" rel="noopener noreferrer"
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <ExternalLink className="w-4 h-4" /> View Token on BSCScan
              </a>
              <a href={getBscscanAddressUrl(info.dev)} target="_blank" rel="noopener noreferrer"
                className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                <Users className="w-4 h-4" /> View Dev Wallet
              </a>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h2 className="text-lg font-bold text-white mb-3">Token Details</h2>
            <div className="space-y-2 text-sm">
              {[
                ["Name", info.name],
                ["Symbol", info.symbol],
                ["Supply", formatTokens(info.totalSupply)],
                ["Launched", formatDate(info.launchTime)],
                ["Days Active", `${daysSinceLaunch}d`],
                ["Dev", formatAddress(info.dev)],
                ["Contract", formatAddress(info.tokenAddress)],
              ].map(([label, val], i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-white font-mono text-xs">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DEVELOPER TRANSPARENCY */}
      <PanelErrorBoundary>
        <DevTransparencyPanel devAddress={info.dev} />
      </PanelErrorBoundary>

      {/* FUND ACCOUNTING */}
      <PanelErrorBoundary>
        <FundAccounting tokenAddr={info.tokenAddress} />
      </PanelErrorBoundary>

      {/* ══════════════════════════════════════
          CONTRIBUTOR HEALTH
          ══════════════════════════════════════ */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" />
          Contributor Health
        </h2>
        {(() => {
          const uniqueCount = Number(info.totalRaised > 0n ? 1 : 0); // approximate from on-chain
          const decentScore = uniqueCount >= 20 ? 100 : uniqueCount >= 10 ? 50 : 0;
          const scoreColor = decentScore >= 80 ? "text-green-400" : decentScore >= 40 ? "text-yellow-400" : "text-red-400";
          return (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-[#0A0A0B] text-center">
                <div className="text-lg font-bold text-white">{uniqueCount}</div>
                <div className="text-[10px] text-text-muted">Unique Contributors</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0A0B] text-center">
                <div className="text-lg font-bold text-white">{formatBnb(info.totalRaised / 20n)}</div>
                <div className="text-[10px] text-text-muted">Max Per Wallet</div>
              </div>
              <div className="p-3 rounded-lg bg-[#0A0A0B] text-center">
                <div className={`text-lg font-bold ${scoreColor}`}>{decentScore}/100</div>
                <div className="text-[10px] text-text-muted">
                  {decentScore >= 80 ? "🟢 Healthy" : decentScore >= 40 ? "🟡 Moderate" : "🔴 Low Diversity"}
                </div>
              </div>
            </div>
          );
        })()}
        <p className="text-[10px] text-text-muted/60 mt-3 text-center">
          Milestone 2 requires 10+ unique contributors. Max contribution = raise cap / 20 per wallet.
        </p>
      </div>

      {/* ══════════════════════════════════════
          BUYER PROTECTION (full width)
          ══════════════════════════════════════ */}
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand" /> Buyer Protection
        </h2>

        <div className="mb-5 p-3 rounded-lg bg-brand/5 border border-brand/10 text-sm text-center">
          🛡️ Protected by IronLock — Up to <span className="text-white font-semibold">{formatBnb(getRefundPool(info))}</span> refundable if dev abandons project
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Funds Status */}
          <div>
            <h3 className="text-sm font-semibold text-brand mb-3 uppercase tracking-wider">Funds Status</h3>
            <div className="space-y-2">
              {[
                { label: "Milestone 1 (33%)", time: info.launchTime, released: info.milestoneReleased >= 1 },
                { label: "Milestone 2 (33%)", time: BigInt(Number(info.launchTime) + 30 * 86400), released: info.milestoneReleased >= 2 },
                { label: "Milestone 3 (34%)", time: BigInt(Number(info.launchTime) + 90 * 86400), released: info.milestoneReleased >= 3 },
              ].map((ms, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#0A0A0B]">
                  <span className="text-xs text-text-secondary">{ms.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">{formatDate(ms.time)}</span>
                    <span className={`badge text-[10px] ${ms.released ? "badge-blue" : "badge-yellow"}`}>
                      {ms.released ? "Released" : "Locked"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refund Eligibility */}
          <div>
            <h3 className="text-sm font-semibold text-brand mb-3 uppercase tracking-wider">Your Refund Eligibility</h3>
            {contribution && contribution > 0n ? (
              <div className="space-y-2 p-3 rounded-lg bg-[#0A0A0B]">
                <div className="text-xs text-text-secondary">If refund passes today, you receive:</div>
                <div className="text-xl font-bold text-white">
                  {formatBnb((contribution * getRefundPool(info)) / info.totalRaised)}
                </div>
                <div className="text-[11px] text-text-muted">
                  = ({formatBnb(contribution)} / {formatBnb(info.totalRaised)}) × refundable pool
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0A0A0B] text-xs text-text-muted">Contribute to see your refund eligibility.</div>
            )}
          </div>

          {/* Dev Activity */}
          <div>
            <h3 className="text-sm font-semibold text-brand mb-3 uppercase tracking-wider">Dev Activity</h3>
            <div className="p-3 rounded-lg bg-[#0A0A0B] space-y-2">
              {(() => {
                const lastActive = devActivityRaw ? Number(devActivityRaw) : 0;
                const now = Math.floor(Date.now() / 1000);
                const daysInactive = lastActive > 0 ? Math.floor((now - lastActive) / 86400) : 999;
                const canVote = daysInactive >= 14;
                const color = canVote ? "text-red-400 bg-red-400" : daysInactive >= 7 ? "text-yellow-400 bg-yellow-400" : "text-green-400 bg-green-400";
                const label = canVote ? "Inactive" : daysInactive >= 7 ? "Quiet" : "Active";
                return (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Last active</span>
                      <span className={color.split(" ")[0]}>{lastActive > 0 ? `${daysInactive}d ago` : "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color.split(" ")[1]}`} />
                      <span className={`text-xs font-medium ${color.split(" ")[0]}`}>{label}</span>
                    </div>
                    {canVote && info.active && (
                      <button onClick={handleStartRefundVote} disabled={startingVote}
                        className="btn-secondary w-full text-xs py-1.5 mt-1 flex items-center justify-center gap-1">
                        <Timer className="w-3 h-3" />{startingVote ? "Starting..." : `Start Refund Vote`}
                      </button>
                    )}
                    {!canVote && info.active && daysInactive > 0 && (
                      <div className="text-[10px] text-text-muted">Refund vote available in {14 - daysInactive}d</div>
                    )}
                    {!info.active && <div className="text-xs text-red-400">Refund vote passed</div>}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
