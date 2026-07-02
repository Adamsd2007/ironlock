"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Lock, Search, Rocket, Compass, Menu, X, HelpCircle, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const NAV_ITEMS = [
  { href: "/launch", label: "Launch", icon: Rocket },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/scan", label: "Scan", icon: Search },
  { href: "/faq", label: "FAQ", icon: HelpCircle },
];

export function Header() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-[#1F1F22] bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Lock className="w-5 h-5 text-brand lock-icon" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight leading-tight">
              Iron<span className="brand-text">Lock</span>
            </span>
            <span className="text-[10px] text-text-muted font-medium leading-tight">
              Rugpulls Impossible.
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-text-secondary hover:text-white hover:bg-[#141416]"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
          {isConnected && (
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/dashboard")
                  ? "bg-brand/10 text-brand"
                  : "text-text-secondary hover:text-white hover:bg-[#141416]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}
        </nav>

        {/* Right: Wallet + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <WalletButton />

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-[#141416] text-text-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#1F1F22] px-4 py-3 space-y-1 animate-slide-up">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-brand/10 text-brand"
                    : "text-text-secondary hover:text-white hover:bg-[#141416]"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          {isConnected && (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                pathname.startsWith("/dashboard")
                  ? "bg-brand/10 text-brand"
                  : "text-text-secondary hover:text-white hover:bg-[#141416]"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
