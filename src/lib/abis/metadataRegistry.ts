export const METADATA_REGISTRY_ABI = [
  {
    inputs: [{ internalType: "address", name: "tokenAddr", type: "address" },
      { internalType: "string", name: "logoUrl", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "website", type: "string" },
      { internalType: "string", name: "twitter", type: "string" },
      { internalType: "string", name: "telegram", type: "string" },
      { internalType: "string", name: "category", type: "string" }],
    name: "setMetadata", outputs: [], stateMutability: "nonpayable", type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "tokenAddr", type: "address" }],
    name: "getMetadata", outputs: [
      { internalType: "string", name: "logoUrl", type: "string" },
      { internalType: "string", name: "description", type: "string" },
      { internalType: "string", name: "website", type: "string" },
      { internalType: "string", name: "twitter", type: "string" },
      { internalType: "string", name: "telegram", type: "string" },
      { internalType: "string", name: "category", type: "string" },
    ], stateMutability: "view", type: "function",
  },
] as const;

export const METADATA_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_METADATA_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

// Warn at import time if the address is not configured
if (METADATA_REGISTRY_ADDRESS === "0x0000000000000000000000000000000000000000") {
  console.warn(
    "[IronLock] NEXT_PUBLIC_METADATA_REGISTRY_ADDRESS not set. " +
    "Token metadata (logos, descriptions, social links) will not load."
  );
}
