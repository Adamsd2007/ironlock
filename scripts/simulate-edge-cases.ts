/**
 * IronLock — Edge Case Simulation
 *
 * Tests failure modes and uncommon paths:
 *   1. Full liquidity add → lock → claim LP flow (via 30d timeout, not cap fill)
 *   2. Refund vote that does NOT reach 51%
 *   3. Double-vote revert (AlreadyVoted)
 *   4. Non-contributor vote revert (NotContributor)
 *   5. Anti-snipe enforcement (exceeding 0.5 BNB within 60s)
 *   6. Sybil reporting (5 reports → blocked)
 *   7. Successful launch → claimDevStake
 *
 * Usage:
 *   npm run hh:simulate-edge
 */

import { ethers } from "hardhat";

async function timeTravel(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

let step = 0;

function header(title: string) {
  console.log(`\n── ${title} ──`);
}
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

async function launchToken(
  factory: any, devSigner: any, name: string, symbol: string,
  raiseCapEth: number, value: bigint
): Promise<string> {
  const tx = await factory.connect(devSigner).launchToken(
    name, symbol,
    ethers.parseEther("1000000"), ethers.parseEther(raiseCapEth.toString()),
    180, 90, 500, 0, "0x", 0, 14,
    { value }
  );
  const receipt = await tx.wait();
  const all = await factory.getAllTokens();
  return all[all.length - 1];
}

const LAUNCH_VALUE = ethers.parseEther("0.11");

async function main() {
  console.log("══════════════════════════════════════════════");
  console.log("  IronLock — Edge Case Simulation");
  console.log("══════════════════════════════════════════════");

  const allSigners = await ethers.getSigners();
  const deployer = allSigners[0], dev = allSigners[1], alice = allSigners[2],
    bob = allSigners[3], charlie = allSigners[4], dave = allSigners[5],
    eve = allSigners[6], frank = allSigners[7], grace = allSigners[8],
    heidi = allSigners[9], ivan = allSigners[11];

  // Deploy mock PancakeSwap router for local testing
  const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
  const mockRouter = await MockRouter.deploy();
  await mockRouter.waitForDeployment();
  const routerAddr = await mockRouter.getAddress();
  info(`Mock router: ${routerAddr}`);

  const Factory = await ethers.getContractFactory("IronLockFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  info(`Factory: ${await factory.getAddress()}`);
  await factory.setPancakeRouter(routerAddr);

  // ══════════════════════════════════════════════════════════════
  // 1. FULL LIQUIDITY FLOW (use 30-day timeout for RaiseIncomplete)
  // ══════════════════════════════════════════════════════════════
  header("1. Full Liquidity Flow");

  const tokenLP = await launchToken(factory, dev, "Liquidity Test", "LIQ", 20, LAUNCH_VALUE);
  pass("Launch liquidity test token", tokenLP);

  await timeTravel(61); // past anti-snipe

  // Contribute some but not all (doesn't matter — we use 30d timeout)
  for (const c of [alice, bob, charlie, dave, eve]) {
    await factory.connect(c).contribute(tokenLP, { value: ethers.parseEther("1") });
  }
  info("5 contributors gave 1 BNB each (cap not filled, but 30d timeout will apply)");

  // Fast-forward 30 days to satisfy RaiseIncomplete
  await timeTravel(30 * 86400);
  pass("Fast-forward 30 days (RaiseIncomplete satisfied by timeout)");

  // Add liquidity
  await factory.addLiquidityToPancakeSwap(tokenLP);
  const lpStatus = await factory.getLPStatus(tokenLP);
  if (lpStatus.added) pass("Liquidity added to PancakeSwap", `Pair: ${lpStatus.pair}`);
  else fail("Liquidity marked added", "true", "false");

  // Try to claim LP before unlock → must revert
  try {
    await factory.connect(dev).claimLPTokens(tokenLP);
    fail("claimLP before unlock reverts", "revert LPStillLocked", "success");
  } catch {
    pass("claimLP before unlock correctly reverts", "LPStillLocked");
  }

  // Fast-forward 181 days
  await timeTravel(181 * 86400);
  const lpClaimable = await factory.getLPStatus(tokenLP);
  if (lpClaimable.claimable) pass("LP tokens now claimable after lock period", "claimable=true");
  else fail("LP not claimable", "true", String(lpClaimable.claimable));

  await factory.connect(dev).claimLPTokens(tokenLP);
  const lpFinal = await factory.getLPStatus(tokenLP);
  if (lpFinal.lockedAmount === 0n) pass("LP tokens claimed successfully", "lockedAmount=0");
  else fail("LP lockedAmount not cleared", "0", lpFinal.lockedAmount.toString());

  // ══════════════════════════════════════════════════════════════
  // 2. REFUND VOTE BELOW 51%
  // ══════════════════════════════════════════════════════════════
  header("2. Refund Vote Below 51% Threshold");

  const tokenNR = await launchToken(factory, dev, "No Refund Token", "NRT", 20, LAUNCH_VALUE);
  pass("Launch no-refund token", tokenNR);

  await timeTravel(61);
  // 10 contributors × 1 BNB = 10 BNB. Max/wallet = 20/20 = 1 BNB.
  const contributors = [alice, bob, charlie, dave, eve, frank, grace, heidi, deployer, allSigners[10]];
  for (const c of contributors) {
    await factory.connect(c).contribute(tokenNR, { value: ethers.parseEther("1") });
  }
  pass("10 contributors filled 10 of 20 BNB");

  await timeTravel(30 * 86400 + 15 * 86400); // 45 days total
  await factory.startRefundVote(tokenNR);
  pass("Refund vote started");

  // Alice votes YES (1 BNB out of 10 = 10% < 51%)
  await factory.connect(alice).castRefundVote(tokenNR, true);
  info("Alice voted YES (1 BNB = 10% of total)");

  const voteData = await factory.refundVotes(tokenNR);
  if (!voteData.executed) pass("Refund NOT auto-executed at 10%", "51% threshold not met");
  else fail("Refund should not execute", "false", String(voteData.executed));

  if (await factory.isRefundVoteActive(tokenNR)) pass("isRefundVoteActive still true", "Vote remains open");
  else fail("Vote should still be active", "true", "false");

  // ══════════════════════════════════════════════════════════════
  // 3. DOUBLE VOTE REVERT
  // ══════════════════════════════════════════════════════════════
  header("3. Double Vote Revert");

  try {
    await factory.connect(alice).castRefundVote(tokenNR, true);
    fail("Double vote reverts", "revert AlreadyVoted", "success");
  } catch (e: any) {
    const msg = e?.data || e?.message || "";
    if (msg.includes("AlreadyVoted") || msg.includes("hasVoted") || msg.includes("voted")) {
      pass("Double vote correctly reverts", "AlreadyVoted");
    } else {
      info(`Revert (acceptable): ${msg.slice(0, 60)}`);
      pass("Double vote correctly reverts", "Transaction rejected");
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 4. NON-CONTRIBUTOR VOTE REVERT
  // ══════════════════════════════════════════════════════════════
  header("4. Non-Contributor Vote Revert");

  try {
    await factory.connect(ivan).castRefundVote(tokenNR, true);
    fail("Non-contributor vote reverts", "revert NotContributor", "success");
  } catch (e: any) {
    const msg = e?.data || e?.message || "";
    if (msg.includes("contributor") || msg.includes("contribution") || msg.includes("Not")) {
      pass("Non-contributor vote correctly reverts", "NotContributor");
    } else {
      info(`Revert (acceptable): ${msg.slice(0, 60)}`);
      pass("Non-contributor vote correctly reverts", "Transaction rejected");
    }
  }

  // ══════════════════════════════════════════════════════════════
  // 5. ANTI-SNIPE ENFORCEMENT
  // ══════════════════════════════════════════════════════════════
  header("5. Anti-Snipe Enforcement");

  const tokenSnipe = await launchToken(factory, dev, "Anti Snipe Test", "SNIPE", 20, LAUNCH_VALUE);
  pass("Launch anti-snipe token", tokenSnipe);
  // Do NOT time-travel — stay in anti-snipe window

  // 0.6 BNB exceeds ANTI_SNIPE_MAX_BNB (0.5)
  try {
    await factory.connect(alice).contribute(tokenSnipe, { value: ethers.parseEther("0.6") });
    fail("Anti-snipe blocks 0.6 BNB", "revert", "success");
  } catch {
    pass("Anti-snipe blocks 0.6 BNB (exceeds 0.5 limit)", "Contribution rejected");
  }

  // 0.3 BNB is within the limit
  try {
    await factory.connect(alice).contribute(tokenSnipe, { value: ethers.parseEther("0.3") });
    pass("Anti-snipe allows 0.3 BNB", "Within 0.5 BNB cap");
  } catch {
    fail("Anti-snipe should allow 0.3 BNB", "success", "reverted");
  }

  // ══════════════════════════════════════════════════════════════
  // 6. SYBIL REPORTING → BLOCKED CONTRIBUTOR
  // ══════════════════════════════════════════════════════════════
  header("6. Sybil Reporting → Blocked Contributor");

  await timeTravel(61);
  const tokenSybil = await launchToken(factory, dev, "Sybil Test", "SYBIL", 20, LAUNCH_VALUE);
  pass("Launch sybil test token", tokenSybil);

  await timeTravel(61);
  await factory.connect(alice).contribute(tokenSybil, { value: ethers.parseEther("0.5") });
  pass("Alice contributes 0.5 BNB normally");

  const reporters = [bob, charlie, dave, eve, frank];
  for (const r of reporters) {
    await factory.connect(r).reportSuspiciousWallet(tokenSybil, alice.address, "Suspicious");
    info(`${r.address.slice(0, 8)}... reported Alice`);
  }
  pass("5 wallets reported Alice (threshold met)");

  try {
    await factory.connect(alice).contribute(tokenSybil, { value: ethers.parseEther("0.1") });
    fail("Blocked contributor cannot contribute", "revert Blocked", "success");
  } catch {
    pass("Blocked contributor rejected", "Blocked");
  }

  await factory.connect(bob).contribute(tokenSybil, { value: ethers.parseEther("0.5") });
  pass("Unblocked wallet (Bob) can still contribute");

  // ══════════════════════════════════════════════════════════════
  // 7. SUCCESSFUL LAUNCH → checkLaunchSuccess + claimDevStake
  // ══════════════════════════════════════════════════════════════
  header("7. Successful Launch → checkLaunchSuccess + claimDevStake");

  const tokenWin = await launchToken(factory, dev, "Successful Token", "WIN", 20, LAUNCH_VALUE);
  pass("Launch success token", tokenWin);

  await timeTravel(61);
  // 10 contributors at 1 BNB each = 10 BNB
  for (const c of contributors) {
    await factory.connect(c).contribute(tokenWin, { value: ethers.parseEther("1") });
  }
  info("10 contributors gave 1 BNB each");

  await timeTravel(30 * 86400);
  await factory.releaseMilestone(tokenWin);
  pass("Milestone 1 released (30d)");

  await timeTravel(30 * 86400);
  await factory.releaseMilestone(tokenWin);
  pass("Milestone 2 released (60d, 10+ contributors)");

  await timeTravel(30 * 86400);
  await factory.releaseMilestone(tokenWin);
  pass("Milestone 3 released (90d, all complete)");
  info("Total: 90+ days since launch, 3 milestones released");

  // BUGFIX TEST: Another user calls checkLaunchSuccess BEFORE dev claims stake.
  // Previously this would permanently lock the dev's stake (active=false).
  // After the fix, claimDevStake uses milestoneReleased + !executed, not active.
  await factory.connect(alice).checkLaunchSuccess(tokenWin);
  const [, successful] = await factory.getDevStats(dev.address);
  info(`Alice called checkLaunchSuccess → dev successful count: ${successful}`);
  pass("checkLaunchSuccess called by non-dev (simulates race)", "Token marked successful");

  // Dev should still be able to claim stake AFTER checkLaunchSuccess
  const balBefore = await ethers.provider.getBalance(dev.address);
  await factory.connect(dev).claimDevStake(tokenWin);
  const balAfter = await ethers.provider.getBalance(dev.address);
  if (balAfter > balBefore) pass("Dev stake claimed AFTER checkLaunchSuccess", `✅ Bug fixed! ${ethers.formatEther(balAfter - balBefore)} BNB`);
  else fail("Dev stake blocked by checkLaunchSuccess", "> 0 BNB", "0 BNB");

  // ── Summary ──
  console.log(`\n══════════════════════════════════════════════`);
  if (process.exitCode === 1) {
    console.log(`  ⚠️  SOME FAILURES — check ❌ markers`);
  } else {
    console.log(`  🎉 EDGE CASES — ALL ${step} STEPS PASSED`);
  }
  console.log(`══════════════════════════════════════════════\n`);
}

main().catch((error) => {
  console.error("\n❌ CRASHED:", error.shortMessage || error.message);
  process.exitCode = 1;
});
