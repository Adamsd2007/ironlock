"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Lock,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

// ── Constants ────────────────────────────
const FACTORY_ADDRESS = "0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9";
const BSCSCAN_CONTRACT_URL = `https://bscscan.com/address/${FACTORY_ADDRESS}`;

const SOCIAL_LINKS = [
  { label: "X (@IronLockxyz)", href: "https://x.com/IronLockxyz" },
  { label: "Telegram", href: "https://t.me/ironlockxyz" },
  { label: "GitHub", href: "https://github.com/Adamsd2007/ironlock" },
];

const PLATFORM_LINKS = [
  { label: "Launch Token", href: "/launch" },
  { label: "Explore Tokens", href: "/explore" },
  { label: "Scan Wallet", href: "/scan" },
  { label: "FAQ", href: "/faq" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Safety Features", href: "/#safety" },
];

const RESOURCE_LINKS = [
  { label: "Smart Contract", href: BSCSCAN_CONTRACT_URL, external: true },
  { label: "FAQ", href: "/faq" },
  { label: "Audit Report", href: "/audit" },
  { label: "Documentation", href: "#" },
  { label: "BNB Chain", href: "https://www.bnbchain.org", external: true },
  { label: "Bug Bounty", href: "#" },
];

// ── Copy Button ──────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-text-muted hover:text-brand hover:bg-brand/10 transition-all"
      title="Copy address"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
        </>
      )}
    </button>
  );
}

// ── Column Title ─────────────────────────
function ColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-brand uppercase tracking-wider mb-4">
      {children}
    </h3>
  );
}

// ── Link Item ────────────────────────────
function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const className =
    "flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand transition-colors duration-200 py-1";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
        <ExternalLink className="w-3 h-3 opacity-50" />
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

// ── Stat Pill ────────────────────────────
function StatPill({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1F1F22] bg-[#0A0A0B] text-xs">
      <span>{icon}</span>
      <span className="text-text-muted">{label}:</span>
      <span className="text-white font-semibold font-mono">{value}</span>
    </div>
  );
}

// ── Footer Component ─────────────────────
export function Footer() {
  return (
    <footer className="bg-[#08080A] border-t border-brand/10">
      {/* ── Main Footer ──────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* COLUMN 1 — Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
              <div className="w-7 h-7 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                <Lock className="w-4 h-4 text-brand" />
              </div>
              <span className="text-lg font-extrabold tracking-tight">
                Iron<span className="brand-text">Lock</span>
                <span className="text-text-muted text-sm font-medium">.xyz</span>
              </span>
            </Link>

            <p className="text-sm font-semibold text-white mb-2">
              Rugpulls are technically impossible.
            </p>
            <p className="text-xs text-text-muted leading-relaxed mb-4">
              The first BNB Chain launchpad where safety is enforced by smart
              contract — not promises.
            </p>

            {/* Contract Address */}
            <div className="mb-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">
                Factory Contract
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={BSCSCAN_CONTRACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-text-secondary hover:text-brand transition-colors"
                >
                  0xa3B2...75d9
                </a>
                <CopyButton text={FACTORY_ADDRESS} />
              </div>
            </div>

            {/* Audit Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-400/5 border border-green-400/20">
              <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] text-green-400 font-medium">
                Audited — 0 Critical Issues
              </span>
            </div>
          </div>

          {/* COLUMN 2 — Platform */}
          <div>
            <ColumnTitle>Platform</ColumnTitle>
            <ul className="space-y-1">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href}>{link.label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3 — Resources */}
          <div>
            <ColumnTitle>Resources</ColumnTitle>
            <ul className="space-y-1">
              {RESOURCE_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} external={link.external}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4 — Community */}
          <div>
            <ColumnTitle>Community</ColumnTitle>
            <ul className="space-y-1">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <FooterLink href={link.href} external={link.href !== "#"}>
                    {link.label}
                  </FooterLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ────────────────────── */}
      <div className="border-t border-[#1F1F22]">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left */}
          <div className="text-center sm:text-left">
            <p className="text-xs text-text-muted">
              &copy; 2026 IronLock.xyz — All rights reserved
            </p>
            <p className="text-[11px] text-text-muted/60 mt-0.5">
              Contract deployed on BNB Chain —{" "}
              <a
                href={BSCSCAN_CONTRACT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand transition-colors"
              >
                Verified on BSCScan
              </a>
            </p>
          </div>

          {/* Right — Stat Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatPill icon="🔒" label="Rugpulls Prevented" value="0" />
            <StatPill icon="🚀" label="Tokens Launched" value="0" />
            <StatPill icon="💰" label="Total Raised" value="0 BNB" />
          </div>
        </div>
      </div>
    </footer>
  );
}
