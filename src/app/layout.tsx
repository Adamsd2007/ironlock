import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Ticker } from "@/components/Ticker";
import { NetworkBanner } from "@/components/WalletButton";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://ironlock.xyz'),
  title: {
    default: 'IronLock — Rugpull-Proof Token Launchpad on BNB Chain',
    template: '%s | IronLock',
  },
  description:
    'The only BNB Chain launchpad where rugpulls are technically impossible. Automatic LP locking, milestone-based fund release, community refund vote, and dev token vesting — all enforced on-chain.',
  keywords: [
    'IronLock',
    'BNB Chain launchpad',
    'rugpull proof',
    'token launchpad',
    'BSC launchpad',
    'DeFi safety',
    'LP lock',
    'PancakeSwap',
    'anti rugpull',
    'token launch',
    'memecoin launchpad',
    'BNB Chain',
    'BSC token',
    'crypto launchpad',
  ],
  authors: [{ name: 'IronLock', url: 'https://ironlock.xyz' }],
  creator: 'IronLock',
  publisher: 'IronLock',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ironlock.xyz',
    siteName: 'IronLock',
    title: 'IronLock — Rugpull-Proof Token Launchpad on BNB Chain',
    description:
      'The only BNB Chain launchpad where rugpulls are technically impossible. LP locking, milestone releases, community refund vote — all on-chain.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'IronLock — Rugpull-Proof Token Launchpad',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@IronLockxyz',
    creator: '@IronLockxyz',
    title: 'IronLock — Rugpull-Proof Token Launchpad on BNB Chain',
    description: 'The only BNB Chain launchpad where rugpulls are technically impossible.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://ironlock.xyz',
  },
  verification: {
    google: 'GOOGLE_VERIFICATION_CODE',
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
