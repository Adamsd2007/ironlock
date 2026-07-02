"use client";

import Link from "next/link";
import { Shield, Zap, Lock, TrendingUp, ArrowRight } from "lucide-react";
import { LiveStats } from "@/components/LiveStats";

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-20">
      {/* ── Hero ─────────────────────────── */}
      <section className="text-center py-20 md:py-28 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F1F22] bg-[#141416] mb-8">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="text-sm text-text-secondary">Now live on BNB Chain</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Launch Memecoins{" "}
          <span className="brand-text">Safely</span>
        </h1>

        <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          The first rugpull-proof memecoin launchpad on BNB Chain. Hardcoded LP
          locks, dev vesting, anti-snipe protection, and community-controlled
          fund release — all enforced by smart contracts. No admin can override.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/launch" className="btn-primary inline-flex items-center gap-2 text-base px-8 py-4">
            <Zap className="w-5 h-5" />
            Launch a Token
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href="/explore" className="btn-secondary inline-flex items-center gap-2 text-base px-8 py-4">
            <TrendingUp className="w-5 h-5" />
            Explore Tokens
          </Link>
        </div>
      </section>

      {/* ── Live Stats ────────────────────── */}
      <LiveStats />

      {/* ── Safety Features Grid ──────────── */}
      <section id="safety" className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
        {[
          {
            icon: <Lock className="w-6 h-6" />,
            title: "LP Locked 180+ Days",
            desc: "Liquidity locked minimum 180 days. No early pulls possible.",
            score: "+20",
          },
          {
            icon: <Shield className="w-6 h-6" />,
            title: "Dev Vesting 90+ Days",
            desc: "Dev tokens release linearly over 90 days. Daily 2% sell cap.",
            score: "+20",
          },
          {
            icon: <Zap className="w-6 h-6" />,
            title: "Anti-Snipe Protection",
            desc: "First 60 seconds: max 0.5 BNB per wallet. Bots blocked.",
            score: "+20",
          },
          {
            icon: <TrendingUp className="w-6 h-6" />,
            title: "Milestone Releases",
            desc: "Funds released 33%/33%/34%. Community can block if dev abandons.",
            score: "+20",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="card hover:border-brand/30 transition-all duration-300 group"
          >
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand mb-4 group-hover:scale-110 transition-transform">
              {feature.icon}
            </div>
            <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-3">
              {feature.desc}
            </p>
            <span className="badge badge-blue">{feature.score} Trust Score</span>
          </div>
        ))}
      </section>

      {/* ── How It Works ──────────────────── */}
      <section id="how-it-works" className="mb-20">
        <h2 className="text-3xl font-bold text-center mb-4">
          How It <span className="brand-text">Works</span>
        </h2>
        <p className="text-text-secondary text-center mb-12 max-w-lg mx-auto">
          Three simple steps — for developers, buyers, and everyone who wants protection.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Step 1 — For Developers */}
          <div className="card relative overflow-hidden text-center group hover:border-brand/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-2xl">
              🚀
            </div>
            <h3 className="font-bold text-white mb-2">
              <span className="brand-text">Launch</span> Your Token
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Connect your wallet, set your token details, and deploy with mandatory safety features locked on-chain. Takes less than 5 minutes.
            </p>
          </div>

          {/* Arrow 1 */}
          <div className="hidden md:flex items-center justify-center">
            <svg className="w-8 h-8 text-brand/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Step 2 — For Buyers */}
          <div className="card relative overflow-hidden text-center group hover:border-brand/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-2xl">
              🛡️
            </div>
            <h3 className="font-bold text-white mb-2">
              Buy with <span className="brand-text">Confidence</span>
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Every token shows a Trust Score 0-100. Liquidity is locked, dev tokens vest slowly, and your investment is protected by automatic refund votes.
            </p>
          </div>

          {/* Arrow 2 */}
          <div className="hidden md:flex items-center justify-center">
            <svg className="w-8 h-8 text-brand/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>

          {/* Step 3 — Protection */}
          <div className="card relative overflow-hidden text-center group hover:border-brand/30 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform text-2xl">
              🔒
            </div>
            <h3 className="font-bold text-white mb-2">
              <span className="brand-text">Smart Contract</span> Enforces Everything
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              No humans involved. The contract automatically locks liquidity, enforces sell limits, releases funds by milestone, and executes refunds if the dev disappears.
            </p>
          </div>
        </div>
      </section>

      {/* ── Trust Stats Bar ──────────────── */}
      <section className="mb-20 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: "🚀", label: "Tokens Launched", value: "—" },
            { icon: "💰", label: "BNB Protected", value: "—" },
            { icon: "🛡", label: "Avg Trust Score", value: "—" },
            { icon: "✅", label: "Successful", value: "—" },
          ].map((s, i) => (
            <div key={i} className="card text-center py-4">
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-lg font-bold text-white">{s.value}</div>
              <div className="text-[10px] text-text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust Score Explainer ─────────── */}
      <section className="card brand-glow text-center max-w-2xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Lock className="w-8 h-8 text-brand lock-icon" />
          <h2 className="text-2xl font-bold">
            <span className="brand-text">Trust Score</span> System
          </h2>
        </div>
        <p className="text-text-secondary mb-6">
          Every token launched through IronLock.xyz gets an on-chain trust score
          (0–100). Higher scores mean stronger safety guarantees. All criteria
          are verifiable on BSCScan.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/scan" className="btn-secondary text-sm">
            Scan a Wallet
          </Link>
          <Link href="/explore" className="btn-primary text-sm">
            View Tokens
          </Link>
        </div>
      </section>
    </div>
  );
}
