// ── Security Headers ─────────────────────
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      // ── Default ──
      "default-src 'self'",

      // ── Scripts ──
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",

      // ── Styles (Google Fonts CSS) ──
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // ── Fonts (Google Fonts files) ──
      "font-src 'self' https://fonts.gstatic.com data:",

      // ── Images ──
      "img-src 'self' data: https: blob:",

      // ── Connections (RPCs, APIs, WalletConnect) ──
      "connect-src 'self'" +
      " https://*.binance.org https://bsc-dataseed.binance.org https://bsc-dataseed1.binance.org https://bsc-dataseed2.binance.org" +
      " https://bsc-testnet-rpc.publicnode.com https://data-seed-prebsc-1-s1.bnbchain.org https://data-seed-prebsc-1-s1.binance.org" +
      " https://*.bscscan.com https://api-testnet.bscscan.com" +
      " https://*.walletconnect.com https://*.walletconnect.org" +
      " wss://*.walletconnect.com wss://*.walletconnect.org" +
      " https://pulse.walletconnect.org https://api.web3modal.org" +
      " https://relay.walletconnect.org https://relay.walletconnect.com" +
      " https://verify.walletconnect.org https://verify.walletconnect.com" +
      " https://*.quicknode.com" +
      " https://api.gopluslabs.io https://fonts.googleapis.com",

      // ── Frames ──
      "frame-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
