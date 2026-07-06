"use client";

import { useState, useRef, useEffect } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Copy, Check, ExternalLink, LogOut, AlertTriangle, ChevronDown,
  Rocket, TrendingUp,
} from "lucide-react";
import { formatAddress, getBscscanAddressUrl } from "@/lib/utils";

// ── Target Chain — from env, not hardcoded ─
const TARGET_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "56");
const BSCSCAN_BASE = process.env.NEXT_PUBLIC_BSCSCAN_URL || "https://bscscan.com";

// ── Chain Check ──────────────────────────
function useWrongNetwork() {
  const chainId = useChainId();
  return chainId !== TARGET_CHAIN_ID;
}

// ── Copy Helper ──────────────────────────
function CopyText({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-brand transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : label || "Copy"}
    </button>
  );
}

// ── Wallet Button ────────────────────────
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const wrongNetwork = useWrongNetwork();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Not Connected ──────────────────────
  if (!isConnected || !address) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal}
            className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
            🔒 Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    );
  }

  // ── Wrong Network ──────────────────────
  if (wrongNetwork) {
    return (
      <button
        onClick={() => switchChain?.({ chainId: TARGET_CHAIN_ID })}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF6B35]/10 border border-[#FF6B35]/30 text-[#FF6B35] text-sm font-medium hover:bg-[#FF6B35]/20 transition-all"
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="hidden sm:inline">Wrong Network</span>
        <span className="sm:hidden">⚠️</span>
      </button>
    );
  }

  // ── Connected on BNB Chain ─────────────
  const displayAddr = formatAddress(address);
  const shortAddr = address.slice(0, 6) + "..." + address.slice(-4);
  const bnbBalance = balance ? Number(balance.value) / 1e18 : 0;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 pl-2 pr-3 py-2 rounded-xl bg-[#141416] border border-[#1F1F22] hover:border-brand/30 transition-all group"
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
          <span className="hidden sm:inline text-sm font-medium text-white">
            {shortAddr}
          </span>
          <span className="sm:hidden text-sm font-medium text-white font-mono">
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
        </div>
        <span className="hidden sm:inline text-xs text-text-muted font-mono">
          {bnbBalance.toFixed(2)} BNB
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#141416] border border-[#1F1F22] shadow-2xl z-50 overflow-hidden animate-fade-in">
          {/* Address Header */}
          <div className="p-3 border-b border-[#1F1F22]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">Connected Wallet</span>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] text-green-400">BNB Chain</span>
              </div>
            </div>
            <p className="text-xs font-mono text-white break-all">{address}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-text-muted">{bnbBalance.toFixed(4)} BNB</span>
              <div className="flex items-center gap-2">
                <CopyText text={address} />
                <a href={getBscscanAddressUrl(address)} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-text-muted hover:text-brand transition-colors">
                  <ExternalLink className="w-3 h-3" /> BSCScan
                </a>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="p-1.5">
            <a href={getBscscanAddressUrl(address)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-[#1F1F22] hover:text-white transition-all">
              <Rocket className="w-4 h-4 text-brand" />
              My Tokens
            </a>
            <a href={getBscscanAddressUrl(address)} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-[#1F1F22] hover:text-white transition-all">
              <TrendingUp className="w-4 h-4 text-brand" />
              My Investments
            </a>
          </div>

          {/* Disconnect */}
          <div className="p-1.5 border-t border-[#1F1F22]">
            <ConnectButton.Custom>
              {({ openAccountModal }) => (
                <button onClick={openAccountModal}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-400/10 transition-all w-full">
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Network Warning Banner ───────────────
export function NetworkBanner() {
  const { isConnected } = useAccount();
  const wrongNetwork = useWrongNetwork();
  const { switchChain } = useSwitchChain();
  const [dismissed, setDismissed] = useState(false);

  if (!isConnected || !wrongNetwork || dismissed) return null;

  return (
    <div className="bg-[#FF6B35]/10 border-b border-[#FF6B35]/20">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <button
          onClick={() => switchChain?.({ chainId: TARGET_CHAIN_ID })}
          className="flex items-center gap-2 text-sm text-[#FF6B35] hover:underline"
        >
          ⚠️ You are on the wrong network. Click here to switch to BNB Chain →
        </button>
        <button onClick={() => setDismissed(true)}
          className="text-[#FF6B35]/60 hover:text-[#FF6B35] text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
