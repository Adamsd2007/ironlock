"use client";

import React from "react";
import { WagmiProvider, createConfig, http, fallback } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import {
  RainbowKitProvider,
  darkTheme,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  okxWallet,
  bybitWallet,
  tokenPocketWallet,
  safepalWallet,
  binanceWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

// ── Chain Configuration ──────────────────
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || "56");
const activeChain = CHAIN_ID === 97 ? bscTestnet : bsc;
const chains = [activeChain] as const;

console.log("[IronLock] Active chain ID:", CHAIN_ID, "→", activeChain.name);

// H-3: RPC fallback — use env RPC with chain-appropriate backup
const PRIMARY_RPC = process.env.NEXT_PUBLIC_BSC_RPC ||
  (CHAIN_ID === 97 ? "https://bsc-testnet-rpc.publicnode.com" : "https://bsc-dataseed.binance.org");

const transport = fallback([
  http(PRIMARY_RPC),
  ...(CHAIN_ID === 97
    ? [http("https://data-seed-prebsc-1-s1.binance.org:8545")]
    : [http("https://bsc-dataseed1.binance.org"), http("https://bsc-dataseed2.binance.org")]),
]);

const transports: Record<number, ReturnType<typeof http>> = {
  [activeChain.id]: transport as any,
};

// ── Wallet Connectors ────────────────────
// H-2: WalletConnect project ID guard
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  console.error(
    "[IronLock] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set. " +
    "Get one at https://cloud.walletconnect.com"
  );
}
const appName = "IronLock";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Popular on BNB Chain",
      wallets: [binanceWallet, trustWallet, okxWallet, tokenPocketWallet],
    },
    {
      groupName: "Other Wallets",
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, bybitWallet, safepalWallet, rainbowWallet],
    },
  ],
  { appName, projectId: projectId || "ironlock" }
);

// ── Wagmi Config ─────────────────────────
// M-4: syncConnectedChain for fresher RPC data
const wagmiConfig = createConfig({
  chains: chains as any,
  transports,
  connectors,
  ssr: true,
  syncConnectedChain: true,
});

// ── React Query Client ───────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 15_000, // M-4: reduced from 30s for fresher data
    },
  },
});

// ── RainbowKit Theme ─────────────────────
const ironlockTheme = darkTheme({
  accentColor: "#4A9EFF",
  accentColorForeground: "#FFFFFF",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

// ── Provider Component ───────────────────
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={ironlockTheme}
          modalSize="compact"
          appInfo={{ appName, learnMoreUrl: "https://ironlock.xyz/about" }}
        >
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export { wagmiConfig };
