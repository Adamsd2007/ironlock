import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Ticker } from "@/components/Ticker";
import { NetworkBanner } from "@/components/WalletButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "IronLock — Rugpulls Are Impossible",
  description:
    "The first BNB Chain launchpad where rugpulls are technically impossible. Mandatory liquidity locks, vesting, and community protection enforced by smart contract.",
  keywords: ["memecoin", "launchpad", "BNB Chain", "rugpull prevention", "BSC", "IronLock"],
  openGraph: {
    title: "IronLock — Rugpulls Are Impossible",
    description: "The first BNB Chain launchpad where rugpulls are technically impossible. Mandatory liquidity locks, vesting, and community protection enforced by smart contract.",
    siteName: "IronLock.xyz",
    url: "https://ironlock.xyz",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IronLock — Rugpulls Are Impossible",
    description: "BNB Chain launchpad where rugpulls are technically impossible. Iron-tight protection.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/shield-icon.svg" />
      </head>
      <body className="min-h-screen bg-surface text-white antialiased">
        <Providers>
          <Ticker />
          <NetworkBanner />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
