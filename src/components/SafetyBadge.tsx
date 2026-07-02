"use client";

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface SafetyBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function SafetyBadge({ score, size = "md", showLabel = true }: SafetyBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSize = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const Icon = score >= 80 ? ShieldCheck : score >= 50 ? Shield : ShieldAlert;
  const colorClass =
    score >= 80
      ? "bg-green-400/10 text-green-400 border-green-400/20"
      : score >= 50
      ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
      : "bg-red-400/10 text-red-400 border-red-400/20";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses[size]} ${colorClass}`}
    >
      <Icon className={iconSize[size]} />
      {score}/100
      {showLabel && (
        <span className="opacity-70">
          {score >= 80 ? "Safe" : score >= 50 ? "Caution" : "Risky"}
        </span>
      )}
    </span>
  );
}
