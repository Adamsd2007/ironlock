"use client";

import { useEffect, useState } from "react";
import { fetchLiveStats } from "@/lib/stats";

export function Ticker() {
  const [tokenCount, setTokenCount] = useState<number | null>(null);

  useEffect(() => {
    fetchLiveStats().then((s) => setTokenCount(s.tokenCount));
  }, []);

  const count = tokenCount ?? "...";

  return (
    <div className="bg-brand/5 border-b border-brand/10 overflow-hidden h-7 flex items-center">
      <div className="ticker-track flex items-center gap-4 whitespace-nowrap animate-ticker">
        {/* Duplicate for seamless loop */}
        {[0, 1].map((dup) => (
          <span key={dup} className="ticker-content inline-flex items-center gap-4 text-[11px] text-text-secondary px-4">
            <span>🔒 IronLock is live on BNB Chain</span>
            <span className="text-text-muted">·</span>
            <span>
              <span className="text-white font-semibold">{count}</span> tokens launched
            </span>
            <span className="text-text-muted">·</span>
            <span>
              <span className="text-green-400 font-semibold">0</span> rugpulls
            </span>
            <span className="text-text-muted">·</span>
            <span>
              Contract verified on{" "}
              <a
                href="https://bscscan.com/address/0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                BSCScan
              </a>
            </span>
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-scroll 30s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
