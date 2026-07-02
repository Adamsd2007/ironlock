"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, Shield, Lock, Zap } from "lucide-react";

// ── Collapsible FAQ Item ──────────────────
function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#1F1F22] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left hover:text-brand transition-colors group"
      >
        <span className="text-white font-semibold text-sm group-hover:text-brand transition-colors pr-4">
          {q}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-brand flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0 group-hover:text-brand transition-colors" />
        )}
      </button>
      {open && (
        <div className="pb-4 text-sm text-text-secondary leading-relaxed space-y-3 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Section Title ─────────────────────────
function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3 pb-2 border-b border-brand/20">
      <span className="text-2xl">{icon}</span>
      {title}
    </h2>
  );
}

// ═══════════════════════════════════════════
export default function FaqPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1F1F22] bg-[#141416] mb-4">
          <span className="text-sm text-text-secondary">📚 Frequently Asked Questions</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          How IronLock <span className="brand-text">Works</span>
        </h1>
        <p className="text-text-secondary max-w-lg mx-auto">
          Everything you need to know about the first rugpull-proof launchpad on BNB Chain.
        </p>
      </div>

      <div className="space-y-10">
        {/* SECTION 1 — How IronLock Works */}
        <div className="card">
          <SectionTitle icon="🔒" title="How IronLock Works" />

          <FaqItem q="What is IronLock?">
            <p>IronLock is a memecoin launchpad on BNB Chain where <strong className="text-white">rugpulls are technically impossible</strong>. When a token launches through IronLock, safety features are locked into the smart contract permanently — no admin, no dev, and not even IronLock itself can override them.</p>
          </FaqItem>

          <FaqItem q="How is IronLock different from PinkSale or DXSale?">
            <p>Other launchpads offer safety features as <strong className="text-white">optional add-ons</strong> that developers can choose to skip. IronLock makes every safety feature <strong className="text-white">mandatory</strong>. There are no toggles, no exceptions, and no overrides. The smart contract enforces everything automatically.</p>
          </FaqItem>

          <FaqItem q="Is IronLock audited?">
            <div className="space-y-2">
              <p>Yes. Our smart contract passed a <strong className="text-white">full security audit</strong> with <strong className="text-green-400">51 tests</strong>, <strong className="text-green-400">0 critical vulnerabilities</strong>, and <strong className="text-green-400">0 high severity issues</strong>. The contract is verified on BSCScan — anyone can read the code:</p>
              <a href="https://bscscan.com/address/0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9#code" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand text-xs hover:underline font-mono break-all">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                bscscan.com/address/0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9#code
              </a>
            </div>
          </FaqItem>
        </div>

        {/* SECTION 2 — LP Lock Explained */}
        <div className="card">
          <SectionTitle icon="🔐" title="The LP Lock Explained" />

          <FaqItem q="What does a 180-day LP lock mean?">
            <p>When a token raises BNB on IronLock, the funds are used to add liquidity to PancakeSwap. This creates <strong className="text-white">LP tokens</strong> that represent ownership of the liquidity pool. These LP tokens are sent to the IronLock smart contract and <strong className="text-white">locked there for a minimum of 180 days</strong>. The dev cannot remove liquidity during this period — not even IronLock can override this.</p>
          </FaqItem>

          <FaqItem q="Is 180 days the maximum or minimum?">
            <p>It is the <strong className="text-white">MINIMUM</strong>. Developers can choose between 180 and 365 days when launching. Once set, the duration <strong className="text-white">cannot be changed</strong> by anyone. If a dev sets 300 days, the lock is 300 days — permanently.</p>
          </FaqItem>

          <FaqItem q="What happens after 180 days?">
            <p>After the lock expires, the developer can withdraw the LP tokens. This is intentional — by day 180, the project has either proven itself or failed naturally. Real projects need the ability to eventually manage their liquidity. The 180-day minimum ensures the project <strong className="text-white">cannot be abandoned in the short term</strong>.</p>
          </FaqItem>

          <FaqItem q="Can the dev still dump the price even with LP locked?">
            <div className="space-y-2">
              <p>No. IronLock has <strong className="text-white">three layers of protection</strong>:</p>
              <ol className="list-decimal ml-4 space-y-1">
                <li><strong className="text-white">LP Lock</strong> — prevents pool drain for 180+ days</li>
                <li><strong className="text-white">Dev Vesting</strong> — dev tokens release slowly over 90 days</li>
                <li><strong className="text-white">2% Daily Sell Cap</strong> — even after vesting, dev can only sell 2% of their allocation per day</li>
              </ol>
              <p>All three work together to make price manipulation nearly impossible.</p>
            </div>
          </FaqItem>
        </div>

        {/* SECTION 3 — Refunds */}
        <div className="card">
          <SectionTitle icon="💰" title="Refunds and Community Protection" />

          <FaqItem q="Can I get a refund if the dev abandons the project?">
            <p>Yes. If the developer is <strong className="text-white">inactive for 14 days</strong>, any contributor can start a refund vote. If <strong className="text-white">51% of contributors</strong> vote yes, the smart contract automatically returns the remaining locked funds proportionally to all contributors. No human approval needed.</p>
          </FaqItem>

          <FaqItem q="How much can I get back in a refund?">
            <div className="space-y-2">
              <p>It depends on when the refund happens. Raised funds are released to the dev in 3 stages:</p>
              <ul className="list-disc ml-4 space-y-1">
                <li><strong className="text-white">33% at launch</strong></li>
                <li><strong className="text-white">33% at 30 days</strong> (if active)</li>
                <li><strong className="text-white">34% at 90 days</strong> (if active)</li>
              </ul>
              <p>If the dev abandons after launch but before 30 days, <strong className="text-green-400">67% of raised funds</strong> are still locked and refundable. The earlier the refund, the more you recover.</p>
            </div>
          </FaqItem>

          <FaqItem q="What if the dev is slow but not completely gone?">
            <p>The dev must show activity every 14 days. If they make any project-related transaction or update, the timer resets. Only <strong className="text-white">complete inactivity for 14 days</strong> triggers a refund vote.</p>
          </FaqItem>

          <FaqItem q="Is the refund automatic?">
            <p>The vote is triggered by the community, but once <strong className="text-white">51% vote yes</strong>, the refund executes automatically. The smart contract handles everything — no support tickets, no lawyers, no waiting for approval.</p>
          </FaqItem>
        </div>

        {/* SECTION 4 — For Devs */}
        <div className="card">
          <SectionTitle icon="🚀" title="For Token Developers" />

          <FaqItem q="How do I launch a token on IronLock?">
            <p>Connect your wallet, complete the 4-step launch flow, and pay <strong className="text-white">0.01 BNB launch fee + 0.1 BNB dev stake</strong>. Your wallet must be at least 7 days old with 10+ transactions to prevent fresh burner wallets.</p>
          </FaqItem>

          <FaqItem q="What is the dev stake?">
            <p>When you launch, you deposit <strong className="text-white">0.1 BNB as a stake</strong>. This proves your commitment to the project. If you deliver successfully (no refund vote passes in 90 days), you get the 0.1 BNB back. If the community votes refund and it passes, <strong className="text-red-400">you lose your stake</strong> to the insurance pool.</p>
          </FaqItem>

          <FaqItem q="Can I get my dev stake back?">
            <p>Yes — after 90 days, if no refund vote has passed, you can claim your 0.1 BNB stake back through the token page.</p>
          </FaqItem>

          <FaqItem q="What are the wallet requirements to launch?">
            <p>Your wallet must be <strong className="text-white">at least 7 days old</strong> and have completed <strong className="text-white">at least 10 transactions</strong> on BNB Chain. This prevents fresh burner wallets that are commonly used by serial rugpullers.</p>
          </FaqItem>

          <FaqItem q="Can I change the safety settings after launch?">
            <p><strong className="text-red-400">No.</strong> Once a token launches, all safety settings are permanently locked on-chain. This is by design — if settings could be changed, they would not provide real protection.</p>
          </FaqItem>
        </div>

        {/* SECTION 5 — Trust Score */}
        <div className="card">
          <SectionTitle icon="⭐" title="Trust Score" />

          <FaqItem q="What is the Trust Score?">
            <div className="space-y-2">
              <p>Every token on IronLock receives a <strong className="text-white">Trust Score from 0 to 100</strong> calculated automatically by the smart contract:</p>
              <ul className="space-y-1">
                <li className="text-green-400">+20 points — LP locked 180+ days</li>
                <li className="text-green-400">+20 points — Dev vesting 90+ days</li>
                <li className="text-green-400">+20 points — Dev allocation under 5%</li>
                <li className="text-green-400">+20 points — Anti-snipe protection active</li>
                <li className="text-green-400">+20 points — Milestone fund release enabled</li>
              </ul>
              <p>A score of <strong className="text-green-400">100 means maximum safety</strong>.</p>
            </div>
          </FaqItem>

          <FaqItem q="Can the Trust Score be faked?">
            <p><strong className="text-red-400">No.</strong> The Trust Score is calculated by the smart contract based on actual on-chain settings — not self-reported by developers. Anyone can verify the score calculation by reading the contract on BSCScan.</p>
          </FaqItem>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-12">
        <p className="text-text-secondary mb-4">Ready to launch or explore?</p>
        <div className="flex gap-4 justify-center">
          <Link href="/launch" className="btn-primary inline-flex items-center gap-2">
            <Zap className="w-4 h-4" /> Launch a Token
          </Link>
          <Link href="/explore" className="btn-secondary inline-flex items-center gap-2">
            <Shield className="w-4 h-4" /> Explore Tokens
          </Link>
        </div>
      </div>
    </div>
  );
}
