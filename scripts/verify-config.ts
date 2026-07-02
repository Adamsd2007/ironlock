import { ethers } from "ethers";

const FACTORY_ADDRESS = "0xa3B27bd5E98a35b0bbc9CA544Df5eB75D54f75d9";
const RPC = process.env.NEXT_PUBLIC_BSC_RPC || "https://bsc-dataseed.binance.org";

async function main() {
  console.log("╔═══════════════════════════════════════╗");
  console.log("║   IronLock — Configuration Check     ║");
  console.log("╚═══════════════════════════════════════╝\n");

  const provider = new ethers.JsonRpcProvider(RPC);

  // ── Step 4: RPC Test ──────────────────
  console.log("=== RPC TEST ===");
  try {
    const block = await provider.getBlockNumber();
    console.log(`✅ RPC working — current block: ${block}`);
  } catch (e: any) {
    console.log(`❌ RPC FAILED: ${e.message}`);
  }

  // ── Step 2: Verifier Check ────────────
  console.log("\n=== VERIFIER CHECK ===");
  const factoryAbi = ["function verifier() view returns (address)", "function owner() view returns (address)"];
  const factory = new ethers.Contract(FACTORY_ADDRESS, factoryAbi, provider);

  try {
    const verifierOnChain = await factory.verifier();
    const envVerifier = process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || "";
    console.log(`On-chain verifier: ${verifierOnChain}`);
    console.log(`Env verifier:      ${envVerifier}`);
    if (verifierOnChain.toLowerCase() === envVerifier.toLowerCase()) {
      console.log("✅ MATCH");
    } else {
      console.log("❌ MISMATCH — verifier not set correctly");
      console.log("   Run: npx hardhat console --network bsc");
      console.log(`   > const f = await ethers.getContractAt("IronLockFactory", "${FACTORY_ADDRESS}")`);
      console.log(`   > await f.setVerifier("${envVerifier}")`);
    }
  } catch (e: any) {
    console.log(`❌ Error reading verifier: ${e.message}`);
  }

  // ── Step 3: Owner Check ──────────────
  console.log("\n=== OWNER CHECK ===");
  try {
    const owner = await factory.owner();
    console.log(`Contract owner: ${owner}`);
  } catch (e: any) {
    console.log(`❌ Error reading owner: ${e.message}`);
  }

  console.log("\nDone.");
}

main().catch(console.error);
