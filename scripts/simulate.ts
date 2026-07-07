/**
 * IronLock E2E Simulation
 *
 * Runs the full token lifecycle on a local Hardhat network:
 *   Deploy → Launch → Contribute → Milestones → Refund Vote → Claim → Dev Stats
 *
 * Usage:
 *   npx hardhat node              # terminal 1 — start local chain
 *   npm run hh:simulate           # terminal 2 — run this script
 *
 *   Or against testnet:
 *   cross-env TS_NODE_PROJECT=tsconfig.hardhat.json hardhat run scripts/simulate.ts --network bscTestnet
 */

import { ethers } from "hardhat";

// ── Helpers ──────────────────────────────────────────────────
async function timeTravel(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

let step = 0;
function pass(msg: string, extra = "") {
  console.log(`  ✅ STEP ${++step}: ${msg}${extra ? " — " + extra : ""}`);
}
function info(msg: string) {
  console.log(`     ℹ️  ${msg}`);
}
function fail(msg: string, expected: string, actual: string) {
  console.log(`  ❌ STEP ${++step}: ${msg}`);
  console.log(`     Expected: ${expected}`);
  console.log(`     Actual:   ${actual}`);
  process.exitCode = 1;
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("  IronLock — Full E2E Lifecycle Simulation");
  console.log("══════════════════════════════════════════════\n");

  // ── Setup ──────────────────────────────────────────────────
  const [deployer, dev, alice, bob, charlie, treasury] = await ethers.getSigners();
  const wallets = { deployer, dev, alice, bob, charlie, treasury };

  info(`Deployer : ${deployer.address}`);
  info(`Dev      : ${dev.address}`);
  info(`Alice    : ${alice.address}`);
  info(`Bob      : ${bob.address}`);
  info(`Charlie  : ${charlie.address}\n`);

  // ── STEP 1: Deploy Factory ──────────────────────────────────
  const Factory = await ethers.getContractFactory("IronLockFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  pass("Deploy IronLockFactory", `at ${factoryAddr}`);

  // Set PancakeSwap testnet router (won't be used but needed for LP functions)
  const ROUTER = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  await factory.setPancakeRouter(ROUTER);
  pass("Set PancakeSwap router", ROUTER);

  // ── STEP 2: Launch Token ────────────────────────────────────
  const TOKEN_NAME = "Safe Moon";
  const TOKEN_SYMBOL = "SMOON";
  const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const RAISE_CAP = ethers.parseEther("100"); // 100 BNB
  const LP_LOCK_DAYS = 180;
  const VESTING_DAYS = 90;
  const DEV_BPS = 500; // 5%
  const LAUNCH_FEE = await factory.launchFee();
  const DEV_STAKE = ethers.parseEther("0.1");
  const LAUNCH_VALUE = LAUNCH_FEE + DEV_STAKE;

  info(`Launch fee: ${ethers.formatEther(LAUNCH_FEE)} BNB, Dev stake: ${ethers.formatEther(DEV_STAKE)} BNB`);
  info(`Total required: ${ethers.formatEther(LAUNCH_VALUE)} BNB`);

  const tx = await factory.connect(dev).launchToken(
    TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
    LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS,
    0, "0x", // skip eligibility (deadline=0)
    0, 14,   // no softcap, 14-day presale
    { value: LAUNCH_VALUE }
  );
  const receipt = await tx.wait();

  // Parse token address from TokenLaunched event
  let tokenAddress = "";
  for (const log of receipt!.logs) {
    // The first indexed param of TokenLaunched is the token address
    if ((log as any).fragment?.name === "TokenLaunched") {
      tokenAddress = (log as any).args[0];
      break;
    }
  }
  // Fallback: read from allTokens
  if (!tokenAddress) {
    const all = await factory.getAllTokens();
    tokenAddress = all[all.length - 1];
  }
  pass("Launch 'Safe Moon' token", `at ${tokenAddress}`);

  // Verify token info via public mapping
  const info_token = await factory.tokens(tokenAddress);
  // Struct fields: tokenAddress, dev, name, symbol, totalSupply, raiseCap,
  // totalRaised, lpLockDays, vestingDays, devAllocationBps, launchTime,
  // antiSnipeEnd, milestoneReleased, milestone1Time, milestone2Time, milestone3Time,
  // safetyScore, active, refundVoteActive, ...
  const actualName = info_token.name;
  if (actualName !== TOKEN_NAME) fail("Token name matches", TOKEN_NAME, actualName);
  else pass("Token name is correct", actualName);

  const actualSymbol = info_token.symbol;
  if (actualSymbol !== TOKEN_SYMBOL) fail("Token symbol matches", TOKEN_SYMBOL, actualSymbol);
  else pass("Token symbol is correct", actualSymbol);

  const actualActive = info_token.active;
  if (!actualActive) fail("Token is active", "true", "false");
  else pass("Token is active", "true");

  // ── STEP 3: Contributions ────────────────────────────────────
  // Fast-forward past anti-snipe window (60s)
  await timeTravel(61);
  pass("Fast-forward past anti-snipe window", "+61 seconds");

  const contributionAmounts = {
    alice: ethers.parseEther("5"),  // 5 BNB
    bob: ethers.parseEther("3"),    // 3 BNB
    charlie: ethers.parseEther("2"), // 2 BNB
  };
  const totalContributed = ethers.parseEther("10");

  await factory.connect(alice).contribute(tokenAddress, { value: contributionAmounts.alice });
  info(`Alice contributed ${ethers.formatEther(contributionAmounts.alice)} BNB`);

  await factory.connect(bob).contribute(tokenAddress, { value: contributionAmounts.bob });
  info(`Bob contributed ${ethers.formatEther(contributionAmounts.bob)} BNB`);

  await factory.connect(charlie).contribute(tokenAddress, { value: contributionAmounts.charlie });
  info(`Charlie contributed ${ethers.formatEther(contributionAmounts.charlie)} BNB`);

  // Verify contributions
  for (const [name, signer, expected] of [
    ["Alice", alice, contributionAmounts.alice],
    ["Bob", bob, contributionAmounts.bob],
    ["Charlie", charlie, contributionAmounts.charlie],
  ] as const) {
    const actual = await factory.getContribution(tokenAddress, signer.address);
    if (actual !== expected) fail(`${name}'s contribution`, ethers.formatEther(expected), ethers.formatEther(actual));
    else pass(`${name}'s contribution`, `${ethers.formatEther(actual)} BNB`);
  }

  // Verify contributor count
  const contributorCount = await factory.getContributorCount(tokenAddress);
  if (contributorCount !== 3n) fail("Contributor count", "3", contributorCount.toString());
  else pass("Contributor count is 3", "3 unique wallets");

  // ── STEP 4: Milestone 1 Release ──────────────────────────────
  const tokenInfoAfter = await factory.tokens(tokenAddress);
  const totalRaised = tokenInfoAfter.totalRaised;
  if (totalRaised !== totalContributed) fail("Total raised", ethers.formatEther(totalContributed), ethers.formatEther(totalRaised));
  else pass("Total raised matches", `${ethers.formatEther(totalRaised)} BNB`);

  // Milestone 1 unlocks at launch time (block.timestamp) — already passed
  // But raise must be complete OR 30 days passed. Let's fast-forward 30 days.
  await timeTravel(30 * 86400);
  pass("Fast-forward 30 days", "Milestone 1 now eligible");

  await factory.releaseMilestone(tokenAddress);
  pass("Release Milestone 1", "33% of dev BNB released");

  // ── STEP 5: Refund Vote ──────────────────────────────────────
  // Fast-forward 14 days of dev inactivity
  await timeTravel(15 * 86400);
  pass("Fast-forward 15 days of inactivity", "Refund vote eligible");

  await factory.startRefundVote(tokenAddress);
  pass("Start refund vote");

  const refundActive = await factory.isRefundVoteActive(tokenAddress);
  if (!refundActive) fail("isRefundVoteActive returns true", "true", "false");
  else pass("isRefundVoteActive is true", "Vote is live");

  // Alice and Bob vote YES (8 BNB out of 10 total = 80% > 51%)
  await factory.connect(alice).castRefundVote(tokenAddress, true);
  info(`Alice voted YES (${ethers.formatEther(contributionAmounts.alice)} BNB weight)`);

  await factory.connect(bob).castRefundVote(tokenAddress, true);
  info(`Bob voted YES (${ethers.formatEther(contributionAmounts.bob)} BNB weight)`);

  // 8/10 = 80% > 51% — should auto-execute
  const refundExecuted = (await factory.refundVotes(tokenAddress)).executed;
  if (!refundExecuted) fail("Refund auto-executed on 51%+ YES", "true", "false");
  else pass("Refund auto-executed", "80% YES > 51% threshold");

  // Verify token is now inactive
  const tokenInfoFinal = await factory.tokens(tokenAddress);
  if (tokenInfoFinal.active) fail("Token marked inactive", "false", "true");
  else pass("Token marked inactive after refund", "false");

  // Charlie didn't vote — but can still claim refund
  // ── STEP 6: Claim Refund ──────────────────────────────────────
  const bobBalanceBefore = await ethers.provider.getBalance(bob.address);

  await factory.connect(bob).claimRefund(tokenAddress);
  pass("Bob claims refund", "Refund transaction confirmed");

  const bobBalanceAfter = await ethers.provider.getBalance(bob.address);
  const bobReceived = bobBalanceAfter - bobBalanceBefore;
  info(`Bob received ~${ethers.formatEther(bobReceived)} BNB (gas costs excluded from this check)`);

  // Verify Bob's contribution is now 0
  const bobContributionAfter = await factory.getContribution(tokenAddress, bob.address);
  if (bobContributionAfter !== 0n) fail("Bob's contribution cleared", "0", ethers.formatEther(bobContributionAfter));
  else pass("Bob's contribution is now 0", "Refund fully processed");

  // ── STEP 7: Dev Stats ─────────────────────────────────────────
  const devStats = await factory.getDevStats(dev.address);
  const [totalLaunches, successful, refunded] = devStats;

  if (totalLaunches !== 1n) fail("Dev total launches", "1", totalLaunches.toString());
  else pass("Dev total launches", "1");

  if (refunded !== 1n) fail("Dev refunded count", "1", refunded.toString());
  else pass("Dev refunded count", "1 (refund vote passed)");

  // ── STEP 8: checkLaunchSuccess (only works 90+ days after launch) ──
  await timeTravel(60 * 86400); // another 60 days = 105 total
  // Token is already inactive from refund, so checkLaunchSuccess would revert

  // Verify it reverts correctly for a refunded token
  try {
    await factory.checkLaunchSuccess(tokenAddress);
    fail("checkLaunchSuccess reverts for refunded token", "revert", "success");
  } catch {
    pass("checkLaunchSuccess correctly reverts for refunded token", "Token was refunded");
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════");
  console.log(`  Simulation Complete — ${step} steps run`);
  if (process.exitCode === 1) {
    console.log("  ⚠️  Some steps FAILED — check ❌ markers above");
  } else {
    console.log("  🎉 ALL STEPS PASSED");
  }
  console.log("══════════════════════════════════════════════\n");

  console.log("Factory address:", factoryAddr);
  console.log("Token address :", tokenAddress);
  console.log("");
  console.log("To run on testnet with a pre-deployed factory:");
  console.log("  cross-env TS_NODE_PROJECT=tsconfig.hardhat.json \\");
  console.log("    hardhat run scripts/simulate.ts --network bscTestnet");
  console.log("  (edit the script to use your deployed FACTORY_ADDRESS)\n");
}

main().catch((error) => {
  console.error("\n❌ SIMULATION CRASHED:", error.shortMessage || error.message);
  process.exitCode = 1;
});
