import { ethers } from "ethers";

const FACTORY = "0x03e4f9Fc4802df2Eb4Ef9d60fDbf4CEE2696A044";
const EXPECTED_VERIFIER = "0xf79FdFC272AbcF0AC9639f4BC0a2107419718908";
const EXPECTED_OWNER = "0xf6aA3B3FDBC45eFfb753E94777824F8713B2D1e9";
const RPC = "https://bsc-dataseed.binance.org";

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║  IronLock — Post-Redeploy Re-Verify     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  console.log(`Contract: ${FACTORY}\n`);

  const provider = new ethers.JsonRpcProvider(RPC);
  const abi = [
    "function verifier() view returns (address)",
    "function owner() view returns (address)",
    "function launchFee() view returns (uint256)",
    "function tokenCount() view returns (uint256)",
  ];
  const factory = new ethers.Contract(FACTORY, abi, provider);

  // 1. RPC Test
  console.log("=== RPC ===");
  const block = await provider.getBlockNumber();
  console.log(`✅ Block ${block}\n`);

  // 2. Verifier
  console.log("=== VERIFIER ===");
  try {
    const v = await factory.verifier();
    const match = v.toLowerCase() === EXPECTED_VERIFIER.toLowerCase();
    console.log(`On-chain: ${v}`);
    console.log(`Expected: ${EXPECTED_VERIFIER}`);
    console.log(match ? "✅ MATCH" : "❌ MISMATCH");
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  // 3. Owner
  console.log("\n=== OWNER ===");
  try {
    const o = await factory.owner();
    const match = o.toLowerCase() === EXPECTED_OWNER.toLowerCase();
    console.log(`On-chain: ${o}`);
    console.log(`Expected: ${EXPECTED_OWNER}`);
    console.log(match ? "✅ MATCH" : "❌ MISMATCH");
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  // Bonus: check contract is alive
  console.log("\n=== BONUS ===");
  try {
    const fee = await factory.launchFee();
    const count = await factory.tokenCount();
    console.log(`Launch fee: ${ethers.formatEther(fee)} BNB`);
    console.log(`Tokens launched: ${count}`);
    console.log("✅ Contract is live and functional");
  } catch (e: any) {
    console.log(`❌ Error: ${e.message}`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
