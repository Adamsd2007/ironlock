import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local.testnet" });

const FACTORY = process.env.NEXT_PUBLIC_FACTORY_ADDRESS!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const VERIFIER = process.env.NEXT_PUBLIC_VERIFIER_ADDRESS!;
const RPC = "https://bsc-testnet-rpc.publicnode.com";

async function main() {
  console.log("=== SET VERIFIER ON TESTNET ===\n");
  console.log(`Factory:  ${FACTORY}`);
  console.log(`Verifier: ${VERIFIER}\n`);

  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const abi = [
    "function setVerifier(address) external",
    "function verifier() view returns (address)",
  ];
  const factory = new ethers.Contract(FACTORY, abi, wallet);

  // Check current verifier
  const current = await factory.verifier();
  console.log(`Current verifier: ${current}`);

  if (current.toLowerCase() === VERIFIER.toLowerCase()) {
    console.log("✅ Already set correctly — no transaction needed");
    return;
  }

  // Set verifier
  console.log("Sending setVerifier tx...");
  const tx = await factory.setVerifier(VERIFIER);
  await tx.wait();
  console.log(`✅ Tx confirmed: ${tx.hash}`);

  // Verify
  const updated = await factory.verifier();
  console.log(`Updated verifier: ${updated}`);
  console.log(updated.toLowerCase() === VERIFIER.toLowerCase() ? "✅ VERIFIED" : "❌ MISMATCH");
}

main().catch(console.error);
