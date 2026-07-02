"use client";

import { useReadContract } from "wagmi";
import { METADATA_REGISTRY_ABI, METADATA_REGISTRY_ADDRESS } from "@/lib/abis/metadataRegistry";

export interface TokenMetadata {
  logoUrl: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  category: string;
}

export function useTokenMetadata(tokenAddress: string | undefined) {
  const { data, isLoading } = useReadContract({
    address: METADATA_REGISTRY_ADDRESS,
    abi: METADATA_REGISTRY_ABI,
    functionName: "getMetadata",
    args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress },
  });

  const metadata: TokenMetadata | undefined = data
    ? {
        logoUrl: (data as any)[0] || "",
        description: (data as any)[1] || "",
        website: (data as any)[2] || "",
        twitter: (data as any)[3] || "",
        telegram: (data as any)[4] || "",
        category: (data as any)[5] || "",
      }
    : undefined;

  return { metadata, isLoading };
}
