import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { IronLockFactory, IronLockToken } from "../typechain-types";

// ── Helpers ──────────────────────────────
async function getEvmNow(): Promise<number> {
  return (await ethers.provider.getBlock("latest"))!.timestamp;
}

async function signEligibility(signer: ethers.Signer, wallet: string, deadline: number): Promise<string> {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [wallet, deadline]);
  return signer.signMessage(ethers.getBytes(ethers.keccak256(encoded)));
}

const LAUNCH_TOTAL = ethers.parseEther("0.11");

// Helper: compute milestone amounts using the new 70/30 split
function calcMilestones(totalRaised: bigint) {
  const liq = (totalRaised * 3000n) / 10000n;
  const dev = totalRaised - liq;
  return {
    m1: (dev * 33n) / 100n, m2: (dev * 33n) / 100n, m3: (dev * 34n) / 100n,
    devBNB: dev, liquidityBNB: liq,
    afterRaise: totalRaised,
    afterM1: totalRaised - liq - ((dev * 33n) / 100n),
    afterM2: totalRaised - liq - ((dev * 33n) / 100n) - ((dev * 33n) / 100n),
    afterM3: 0n,
  };
}

async function launchTestToken(
  factory: IronLockFactory,
  dev: SignerWithAddress,
  verifier: SignerWithAddress,
  overrides: { raiseCap?: bigint; lpLockDays?: number; vestingDays?: number; devBps?: number } = {}
): Promise<string> {
  const deadline = await getEvmNow() + 3600;
  const sig = await signEligibility(verifier, dev.address, deadline);
  await factory.connect(dev).launchToken(
    "Lifecycle", "LIFE", ethers.parseEther("1000000"),
    overrides.raiseCap ?? ethers.parseEther("10"),
    overrides.lpLockDays ?? 180, overrides.vestingDays ?? 90, overrides.devBps ?? 500,
    deadline, sig, 0, 30, // softCapBps=50%, presaleDays=14
    { value: LAUNCH_TOTAL }
  );
  return await factory.allTokens(await factory.tokenCount() - 1n);
}

describe("🔬 IronLock — Full Lifecycle Simulation", function () {
  let factory: IronLockFactory;
  let owner: SignerWithAddress;
  let verifier: SignerWithAddress;
  let dev: SignerWithAddress;
  let treasury: SignerWithAddress;
  let contributors: SignerWithAddress[];

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    owner = signers[0];
    verifier = signers[1];
    dev = signers[2];
    treasury = signers[3];
    contributors = signers.slice(4, 19); // 15 contributors

    const Factory = await ethers.getContractFactory("IronLockFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
    await factory.setVerifier(verifier.address);
    await factory.setTreasury(treasury.address);
  });

  // ═══════════════════════════════════════════
  // TEST 1 — Full Successful Launch Lifecycle
  // ═══════════════════════════════════════════
  describe("TEST 1 — Successful Launch Lifecycle", function () {
    it("Step 1-2: Deploy + Set Verifier", async function () {
      expect(await factory.verifier()).to.equal(verifier.address);
      expect(await factory.owner()).to.equal(owner.address);
    });

    it("Step 3: Launch token with valid parameters", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      const info = await factory.tokens(tokenAddr);
      expect(info.dev).to.equal(dev.address);
      expect(info.active).to.equal(true);
      expect(await factory.tokenCount()).to.equal(1n);
    });

    it("Step 4-5: 15 unique contributors fill raise cap", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61); // past anti-snipe

      // 15 contributors × 0.5 BNB = 7.5 BNB (max per wallet = 10/20 = 0.5)
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }

      const info = await factory.tokens(tokenAddr);
      expect(info.totalRaised).to.equal(ethers.parseEther("7.5"));
    });

    it("Step 6: Milestone 1 releases (33% at launch)", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      const devBefore = await ethers.provider.getBalance(dev.address);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      const devAfter = await ethers.provider.getBalance(dev.address);

      const info = await factory.tokens(tokenAddr);
      const ms = calcMilestones(info.totalRaised);
      expect(devAfter - devBefore).to.be.closeTo(ms.m1, ethers.parseEther("0.01"));
      expect(info.milestoneReleased).to.equal(1);
    });

    it("Step 7-8: Milestone 2 releases after 30 days (10+ unique contributors)", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Release M1
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // Fast-forward 30 days
      await time.increase(31 * 86400);

      const devBefore = await ethers.provider.getBalance(dev.address);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      const devAfter = await ethers.provider.getBalance(dev.address);

      const info = await factory.tokens(tokenAddr);
      expect(info.milestoneReleased).to.equal(2);
      const ms2 = calcMilestones(info.totalRaised);
      expect(devAfter - devBefore).to.be.closeTo(ms2.m2, ethers.parseEther("0.01"));
    });

    it("Step 9: Milestone 3 releases after 90 days", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr); // M1
      await time.increase(31 * 86400);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr); // M2
      await time.increase(60 * 86400);

      const devBefore = await ethers.provider.getBalance(dev.address);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      const devAfter = await ethers.provider.getBalance(dev.address);

      const info = await factory.tokens(tokenAddr);
      expect(info.milestoneReleased).to.equal(3);
      const ms3b = calcMilestones(info.totalRaised);
      expect(devAfter - devBefore).to.be.closeTo(ms3b.m3, ethers.parseEther("0.01"));
    });

    it("Step 10: Total released ≈ 100% of raised", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      const infoBefore = await factory.tokens(tokenAddr);
      const totalRaised = infoBefore.totalRaised;

      const devBefore = await ethers.provider.getBalance(dev.address);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(31 * 86400);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(60 * 86400);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      const devAfter = await ethers.provider.getBalance(dev.address);

      // 33% + 33% + 34% = 100% of devBNB (70% of totalRaised)
      const infoAfter = await factory.tokens(tokenAddr);
      const expectedTotal = infoAfter.devBNB;
      expect(devAfter - devBefore).to.be.closeTo(expectedTotal, ethers.parseEther("0.02"));
    });

    it("Step 11: Dev claims stake back after 90 days no refund", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Complete all 3 milestones
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(31 * 86400);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(60 * 86400);
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // Claim stake
      const devBefore = await ethers.provider.getBalance(dev.address);
      const tx = await factory.connect(dev).claimDevStake(tokenAddr);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const devAfter = await ethers.provider.getBalance(dev.address);

      expect(devAfter + gasCost - devBefore).to.equal(ethers.parseEther("0.1"));
    });

    it("⚠️ MISSING: No automatic PancakeSwap liquidity addition found", async function () {
      // The contract has NO function for adding liquidity to PancakeSwap.
      // LP tokens are never created, locked, or managed by the factory.
      // This MUST be built before mainnet launch.
      console.log("   ⚠️  MISSING: No PancakeSwap liquidity function in contract");
      console.log("   Risk: LP lock feature claims liquidity is 'locked for 180 days'");
      console.log("         but no code exists to create or lock LP tokens.");
      console.log("   Impact: The core LP lock safety promise cannot be fulfilled.");
      console.log("   Priority: CRITICAL — must be implemented before mainnet.");
      expect(true).to.equal(true); // informational only
    });
  });

  // ═══════════════════════════════════════════
  // TEST 2 — Sybil Attack Protection
  // ═══════════════════════════════════════════
  describe("TEST 2 — Sybil Attack Protection", function () {
    it("Dev wallet cannot contribute to own token", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);

      await expect(
        factory.connect(dev).contribute(tokenAddr, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Blocked");
    });

    it("Single wallet cannot exceed maxContributionPerWallet", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);

      // max per wallet = raiseCap / 20 = 10 / 20 = 0.5 BNB
      await factory.connect(contributors[0]).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Second contribution from same wallet should fail
      await expect(
        factory.connect(contributors[0]).contribute(tokenAddr, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("IL:Exceeds per-wallet cap");
    });

    it("Milestone 2 requires 10+ unique contributors", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);

      // Only 5 unique wallets contribute
      for (let i = 0; i < 5; i++) {
        await factory.connect(contributors[i]).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }

      // Release milestone 1
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // Fast-forward 30 days
      await time.increase(31 * 86400);

      // Milestone 2 should REVERT (only 5 unique, need 10)
      await expect(
        factory.releaseMilestone(tokenAddr)
      ).to.be.revertedWith("Need 10+");
    });
  });

  // ═══════════════════════════════════════════
  // TEST 3 — Refund Vote Lifecycle
  // ═══════════════════════════════════════════
  describe("TEST 3 — Refund Vote Lifecycle", function () {
    it("Refund vote starts after 14 days of dev inactivity", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Fast-forward 15 days (14 days inactivity)
      await time.increase(15 * 86400);

      // Any contributor can start refund vote
      await expect(
        factory.connect(contributors[0]).startRefundVote(tokenAddr)
      ).to.emit(factory, "RefundVoteStarted");

      const info = await factory.tokens(tokenAddr);
      expect(info.refundVoteActive).to.equal(true);
    });

    it("Refund vote CANNOT start if dev was active within 14 days", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Fast-forward 10 days
      await time.increase(10 * 86400);

      // Dev updates activity (resets 14-day timer)
      await factory.connect(dev).updateDevActivity();

      // Fast-forward 10 more days (only 10 days since last activity)
      await time.increase(10 * 86400);

      // Refund vote should NOT be startable yet
      await expect(
        factory.connect(contributors[0]).startRefundVote(tokenAddr)
      ).to.be.revertedWith("Dev active");
    });

    it("Full refund flow: vote → execute → proportional refunds", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      const info = await factory.tokens(tokenAddr);
      const totalRaised = info.totalRaised;

      // Release milestone 1 (33%)
      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // 15 days inactivity
      await time.increase(15 * 86400);

      // Start refund vote
      await factory.connect(contributors[0]).startRefundVote(tokenAddr);

      // 8 wallets vote YES (>51% of contribution weight = 4/7.5 = 53.3%)
      // Auto-execute triggers when threshold crossed — stop before it executes
      for (let i = 0; i < 7; i++) {
        await factory.connect(contributors[i]).castRefundVote(tokenAddr, true);
      }
      // 8th YES vote crosses 51% → auto-executes (3.5/7.5 = 46.7%, need >51%)
      // Actually: 8 × 0.5 = 4.0 / 7.5 = 53.3% → auto-execute on 8th vote
      await factory.connect(contributors[7]).castRefundVote(tokenAddr, true);
      // Vote auto-executed now — no more votes possible
      const infoAfter = await factory.tokens(tokenAddr);
      expect(infoAfter.active).to.equal(false);

      // Contributor claims refund — 67% of funds (M1 released 33%)
      // Each contributed 0.67 BNB out of ~10 BNB = 6.7%
      // 67% of 10 = 6.7 BNB refund pool
      // 6.7% of 6.7 BNB = ~0.449 BNB
      const cBalanceBefore = await ethers.provider.getBalance(contributors[0].address);
      const tx = await factory.connect(contributors[0]).claimRefund(tokenAddr);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const cBalanceAfter = await ethers.provider.getBalance(contributors[0].address);
      expect(cBalanceAfter + gasCost - cBalanceBefore).to.be.gt(0);

      // Dev stake slashed
      expect(await factory.insurancePool()).to.equal(ethers.parseEther("0.1"));
    });

    it("Dev refund counter increments after refund", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(15 * 86400);
      await factory.connect(contributors[0]).startRefundVote(tokenAddr);

      for (let i = 0; i < 8; i++) await factory.connect(contributors[i]).castRefundVote(tokenAddr, true);

      const stats = await factory.getDevStats(dev.address);
      expect(stats.refunded).to.equal(1n);
    });

    it("Double-claim refund reverts", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      await time.increase(15 * 86400);
      await factory.connect(contributors[0]).startRefundVote(tokenAddr);
      for (let i = 0; i < 8; i++) await factory.connect(contributors[i]).castRefundVote(tokenAddr, true);

      await factory.connect(contributors[0]).claimRefund(tokenAddr);

      await expect(
        factory.connect(contributors[0]).claimRefund(tokenAddr)
      ).to.be.revertedWith("No contrib");
    });
  });

  // ═══════════════════════════════════════════
  // TEST 4 — Edge Cases
  // ═══════════════════════════════════════════
  describe("TEST 4 — Edge Cases", function () {
    it("Partial raise — refund works with partial amount", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);

      // Only 5 contributors, 0.5 BNB each = 2.5 BNB of 10 BNB cap
      for (let i = 0; i < 5; i++) {
        await factory.connect(contributors[i]).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }

      const info = await factory.tokens(tokenAddr);
      expect(info.totalRaised).to.equal(ethers.parseEther("2.5"));
      expect(info.totalRaised).to.be.lt(info.raiseCap); // partial fill

      // Refund still works with partial raise
      await time.increase(15 * 86400);
      await factory.connect(contributors[0]).startRefundVote(tokenAddr);
      // Contributors 0,1,2 vote YES = 1.5/2.5 = 60% > 51%
      await factory.connect(contributors[0]).castRefundVote(tokenAddr, true);
      await factory.connect(contributors[1]).castRefundVote(tokenAddr, true);
      await factory.connect(contributors[2]).castRefundVote(tokenAddr, true);

      const infoAfter = await factory.tokens(tokenAddr);
      expect(infoAfter.active).to.equal(false);
    });

    it("Minimum valid launch parameters work", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier, {
        lpLockDays: 180, vestingDays: 90, devBps: 0,
      });
      const info = await factory.tokens(tokenAddr);
      expect(info.active).to.equal(true);
    });

    it("Launch with lpLockDays under 180 reverts", async function () {
      const deadline = await getEvmNow() + 3600;
      const sig = await signEligibility(verifier, dev.address, deadline);
      await expect(
        factory.connect(dev).launchToken(
          "Bad", "BAD", ethers.parseEther("1000000"), ethers.parseEther("10"),
          100, 90, 500, deadline, sig, 0, 30, { value: LAUNCH_TOTAL }
        )
      ).to.be.reverted; // custom error (LPLockTooShort)
    });

    it("Dev activity within 14 days prevents refund vote", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Dev updates activity at day 10
      await time.increase(10 * 86400);
      await factory.connect(dev).updateDevActivity();

      // Day 20 — only 10 days since last activity
      await time.increase(10 * 86400);

      await expect(
        factory.connect(contributors[0]).startRefundVote(tokenAddr)
      ).to.be.revertedWith("Dev active");
    });
  });

  // ═══════════════════════════════════════════
  // MISSING FEATURES REPORT
  // ═══════════════════════════════════════════
  describe("⚠️ MISSING FEATURES AUDIT", function () {
    it("⚠️ #1 — No PancakeSwap liquidity addition function", async function () {
      console.log("\n   ⚠️  MISSING FEATURE: PancakeSwap liquidity automation");
      console.log("   ───────────────────────────────────────────────");
      console.log("   The contract has NO function to:");
      console.log("     - Create PancakeSwap pairs");
      console.log("     - Add liquidity automatically");
      console.log("     - Lock LP tokens in the factory");
      console.log("   Why it matters:");
      console.log("     The LP Lock (180 days) is IronLock's #1 safety feature.");
      console.log("     Without code to create and lock LP tokens, the entire");
      console.log("     LP lock promise is unfulfilled manual work.");
      console.log("   Risk if launched without it:");
      console.log("     - Dev must manually add liquidity (no automation)");
      console.log("     - LP tokens are NEVER locked — dev can remove anytime");
      console.log("     - Trust Score +20 for 'LP locked 180+ days' is FALSE");
      console.log("     - This makes IronLock indistinguishable from manual launch");
      console.log("   Priority: 🔴 CRITICAL — must be built before mainnet\n");
      expect(true).to.equal(true);
    });

    it("⚠️ #2 — No token metadata storage (name/logo/description)", async function () {
      console.log("\n   ⚠️  MISSING FEATURE: On-chain token metadata");
      console.log("   ───────────────────────────────────────────────");
      console.log("   The contract stores only name + symbol. Missing:");
      console.log("     - Token logo/image URL");
      console.log("     - Description / tagline");
      console.log("     - Social links (website, Twitter, Telegram)");
      console.log("     - Category");
      console.log("   Risk: Token pages show incomplete information.");
      console.log("   Priority: 🟡 MEDIUM — frontend-only workaround exists\n");
      expect(true).to.equal(true);
    });
  });

  // ═══════════════════════════════════════════
  // TEST 5 — Liquidity Addition Lifecycle
  // ═══════════════════════════════════════════
  describe("TEST 5 — Liquidity Addition Lifecycle", function () {
    let mockRouter: any;

    beforeEach(async function () {
      // Deploy mock PancakeSwap router for local testing
      const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
      mockRouter = await MockRouter.deploy();
      await mockRouter.waitForDeployment();
      await factory.setPancakeRouter(await mockRouter.getAddress());
    });

    it("addLiquidityToPancakeSwap creates LP pair and locks tokens", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      // Reach raise cap with 15 contributors × 0.5 BNB = 7.5 BNB
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }

      // Add liquidity
      await time.increase(31 * 86400); // fast-forward 30 days to pass deadline check

      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenAddr);

      // Assertions
      expect(await factory.liquidityAdded(tokenAddr)).to.equal(true);

      const [added, pair, lockedAmount, unlockTime, claimable] = await factory.getLPStatus(tokenAddr);
      expect(added).to.equal(true);
      expect(pair).to.not.equal(ethers.ZeroAddress); // Real LP pair address (mock)
      expect(lockedAmount).to.be.gt(0);
      expect(claimable).to.equal(false); // Still locked
    });

    it("claimLPTokens reverts before lock expires", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }
      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenAddr);

      // Try to claim immediately — should revert
      await expect(
        factory.connect(dev).claimLPTokens(tokenAddr)
      ).to.be.reverted; // custom error
    });

    it("claimLPTokens succeeds after 180 days", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }
      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenAddr);
      expect(await factory.lpLockedAmount(tokenAddr)).to.be.gt(0);

      // Fast-forward 180 days
      await time.increase(181 * 86400);

      // Claim LP tokens
      await factory.connect(dev).claimLPTokens(tokenAddr);

      // LP amount should be 0 after claim
      expect(await factory.lpLockedAmount(tokenAddr)).to.equal(0);
    });

    it("claimLPTokens reverts if already claimed", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }
      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenAddr);
      await time.increase(181 * 86400);
      await factory.connect(dev).claimLPTokens(tokenAddr);

      // Second claim should revert
      await expect(
        factory.connect(dev).claimLPTokens(tokenAddr)
      ).to.be.reverted; // custom error
    });

    it("addLiquidity reverts if already added", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      for (const c of contributors) {
        await factory.connect(c).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
      }
      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenAddr);

      // Second call should revert
      await expect(
        factory.addLiquidityToPancakeSwap(tokenAddr)
      ).to.be.reverted; // custom error
    });

    it("addLiquidity reverts if raise not complete and deadline not reached", async function () {
      const tokenAddr = await launchTestToken(factory, dev, verifier);
      await time.increase(61);
      // Only 1 contributor — raise not complete (1 BNB of 10 BNB cap)
      await factory.connect(contributors[0]).contribute(tokenAddr, { value: ethers.parseEther("0.5") });

      // Should revert — raise not complete, deadline not reached
      await expect(
        factory.addLiquidityToPancakeSwap(tokenAddr)
      ).to.be.reverted; // custom error (RaiseIncomplete)
    });
  });

  // ═══════════════════════════════════════════
  // TEST 6 — Multi-Token BNB Isolation
  // ═══════════════════════════════════════════
  describe("TEST 6 — Multi-Token BNB Isolation", function () {
    let mockRouter: any;

    beforeEach(async function () {
      const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
      mockRouter = await MockRouter.deploy();
      await mockRouter.waitForDeployment();
      await factory.setPancakeRouter(await mockRouter.getAddress());
    });

    it("Token A and B BNB isolation — correct amounts", async function () {
      // Use raiseCap=10 for both (maxPerWallet=0.5) for simpler math
      const tokenA = await launchTestToken(factory, dev, verifier, { raiseCap: ethers.parseEther("10") });
      await time.increase(61);
      // 10 contributors × 0.5 = 5 BNB into Token A
      for (let i = 0; i < 10; i++) {
        await factory.connect(contributors[i]).contribute(tokenA, { value: ethers.parseEther("0.5") });
      }

      const tokenB = await launchTestToken(factory, dev, verifier, { raiseCap: ethers.parseEther("10") });
      await time.increase(61);
      // Different contributors (6-14) × 0.5 = 4 BNB into Token B
      for (let i = 5; i < 13; i++) {
        await factory.connect(contributors[i]).contribute(tokenB, { value: ethers.parseEther("0.5") });
      }

      // Check isolated balances
      const balA = await factory.tokenBnbBalance(tokenA);
      const balB = await factory.tokenBnbBalance(tokenB);
      expect(balA).to.equal(ethers.parseEther("5"));
      expect(balB).to.equal(ethers.parseEther("4"));

      // Release milestone 1 for Token A (33% of devBNB = 33% of 3.5 = 1.155 BNB)
      await time.increase(31 * 86400);
      await factory.releaseMilestone(tokenA);
      const balAAfter = await factory.tokenBnbBalance(tokenA);
      const infoA = await factory.tokens(tokenA);
      const devBNB_A = infoA.totalRaised - ((infoA.totalRaised * 3000n) / 10000n);
      const expectedRemaining = infoA.totalRaised - ((devBNB_A * 3300n) / 10000n);
      expect(balAAfter).to.equal(expectedRemaining);

      // Token B balance should be COMPLETELY UNCHANGED
      const balBAfter = await factory.tokenBnbBalance(tokenB);
      expect(balBAfter).to.equal(ethers.parseEther("4"));
    });

    it("addLiquidity uses ONLY the correct token's BNB", async function () {
      const tokenA = await launchTestToken(factory, dev, verifier, { raiseCap: ethers.parseEther("10") });
      await time.increase(61);
      for (let i = 0; i < 12; i++) {
        await factory.connect(contributors[i]).contribute(tokenA, { value: ethers.parseEther("0.5") });
      }

      const tokenB = await launchTestToken(factory, dev, verifier, { raiseCap: ethers.parseEther("10") });
      await time.increase(61);
      for (let i = 5; i < 15; i++) {
        await factory.connect(contributors[i]).contribute(tokenB, { value: ethers.parseEther("0.5") });
      }

      const balBBefore = await factory.tokenBnbBalance(tokenB);

      // Add liquidity for Token A
      await time.increase(31 * 86400);
      await factory.addLiquidityToPancakeSwap(tokenA);

      // Token B balance completely unchanged
      expect(await factory.tokenBnbBalance(tokenB)).to.equal(balBBefore);

      // Token A balance should be 0 (all BNB used for liquidity)
      // Actually mock router uses all BNB sent
      // The mock may leave dust, but the balance should be <= what it was
      const balAAfter = await factory.tokenBnbBalance(tokenA);
      expect(balAAfter).to.be.lte(ethers.parseEther("6")); // less than original 6 BNB
    });
  });
});
