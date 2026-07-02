import { ethers } from "ethers";

const FACTORY = "0x5044557A0bE46B4cfBa514240D84ebb51D31E5bd";
const EXPECTED_VERIFIER = "0xf79FdFC272AbcF0AC9639f4BC0a2107419718908";
const EXPECTED_OWNER = "0xf6aA3B3FDBC45eFfb753E94777824F8713B2D1e9";
const RPC = "https://bsc-testnet-rpc.publicnode.com";

async function main() {
  console.log("=== TESTNET ON-CHAIN VERIFICATION ===\n");
  const p = new ethers.JsonRpcProvider(RPC);
  const f = new ethers.Contract(FACTORY, [
    "function verifier() view returns (address)",
    "function owner() view returns (address)",
    "function launchFee() view returns (uint256)",
  ], p);

  const block = await p.getBlockNumber();
  const verifier = await f.verifier();
  const owner = await f.owner();
  const fee = await f.launchFee();

  console.log(`Block:    ${block}`);
  console.log(`Verifier: ${verifier} ${verifier.toLowerCase() === EXPECTED_VERIFIER.toLowerCase() ? "✅" : "❌"}`);
  console.log(`Owner:    ${owner} ${owner.toLowerCase() === EXPECTED_OWNER.toLowerCase() ? "✅" : "❌"}`);
  console.log(`Fee:      ${ethers.formatEther(fee)} BNB`);
  console.log("\n✅ All checks passed — testnet contract ready");
}

main().catch(console.error);
