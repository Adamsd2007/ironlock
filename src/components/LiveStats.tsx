"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchLiveStats, type LiveStats } from "@/lib/stats";

// ── Count-Up Hook ────────────────────────
function useCountUp(
  target: number,
  isDecimal: boolean,
  triggered: boolean
): string {
  const [display, setDisplay] = useState("0");
  const raf = useRef<number>();

  useEffect(() => {
    if (!triggered) return;
    let current = 0;
    const duration = 1200; // ms
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      current = target * eased;

      if (isDecimal) {
        setDisplay(current.toFixed(4));
      } else {
        setDisplay(Math.floor(current).toString());
      }

      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setDisplay(isDecimal ? target.toFixed(4) : target.toString());
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, isDecimal, triggered]);

  return display;
}

// ── LiveStats Component ──────────────────
export function LiveStats() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch from contract
  useEffect(() => {
    let cancelled = false;
    fetchLiveStats().then((s) => { if (!cancelled) setStats(s); });
    return () => { cancelled = true; };
  }, []);

  // Intersection Observer
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const fallback: LiveStats = {
    tokenCount: 0,
    totalRaisedFormatted: "0",
    insurancePoolFormatted: "0",
    rugpullsPrevented: 0,
  };

  const s = stats ?? fallback;

  const totalRaisedNum = parseFloat(s.totalRaisedFormatted);
  const insuranceNum = parseFloat(s.insurancePoolFormatted);

  const countUpTokens = useCountUp(s.tokenCount, false, triggered);
  const countUpRaised = useCountUp(totalRaisedNum, true, triggered);
  const countUpInsurance = useCountUp(insuranceNum, true, triggered);

  const cards = [
    {
      icon: "🚀",
      label: "Tokens Launched",
      value: countUpTokens,
      color: "text-brand",
      bg: "bg-brand/10",
      border: "border-brand/20",
    },
    {
      icon: "💰",
      label: "Total BNB Raised",
      value: `${countUpRaised} BNB`,
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
    },
    {
      icon: "🛡️",
      label: "Rugpulls",
      value: "0",
      subtext: "Enforced by contract",
      color: "text-green-400",
      bg: "bg-green-400/10",
      border: "border-green-400/20",
    },
    {
      icon: "🔒",
      label: "Insurance Pool",
      value: `${countUpInsurance} BNB`,
      color: "text-brand",
      bg: "bg-brand/10",
      border: "border-brand/20",
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
      {cards.map((card, i) => (
        <div
          key={i}
          className={`card text-center ${card.border} transition-all duration-300 hover:scale-[1.03]`}
        >
          <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mx-auto mb-3 text-xl`}>
            {card.icon}
          </div>
          <div className={`text-2xl md:text-3xl font-extrabold ${card.color} font-mono`}>
            {card.value}
          </div>
          <p className="text-xs text-text-muted mt-1">{card.label}</p>
          {card.subtext && (
            <p className="text-[10px] text-text-muted/60 mt-0.5">{card.subtext}</p>
          )}
        </div>
      ))}
    </div>
  );
}
