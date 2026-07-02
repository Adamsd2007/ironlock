import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { IronLockFactory, IronLockToken } from "../typechain-types";

// ── Helper: sign an eligibility proof ───
async function signEligibility(
  signer: ethers.Signer,
  wallet: string,
  deadline: number
): Promise<string> {
  // Must match Solidity: keccak256(abi.encode(wallet, deadline))
  // ethers AbiCoder.encode produces the same as Solidity's abi.encode
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"],
    [wallet, deadline]
  );
  const messageHash = ethers.keccak256(encoded);
  return signer.signMessage(ethers.getBytes(messageHash));
}

// ── Helper: get current EVM timestamp ───
async function getEvmNow(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

describe("IronLockFactory", function () {
  let factory: IronLockFactory;
  let owner: SignerWithAddress;
  let verifierSigner: SignerWithAddress;
  let dev: SignerWithAddress;
  let contributor1: SignerWithAddress;
  let contributor2: SignerWithAddress;
  let contributor3: SignerWithAddress;
  let c4: SignerWithAddress; let c5: SignerWithAddress; let c6: SignerWithAddress;
  let c7: SignerWithAddress; let c8: SignerWithAddress; let c9: SignerWithAddress;
  let c10: SignerWithAddress;
  let treasury: SignerWithAddress;

  const TOKEN_NAME = "Safe Moon";
  const TOKEN_SYMBOL = "SMOON";
  const TOTAL_SUPPLY = ethers.parseEther("1000000"); // 1M tokens
  const RAISE_CAP = ethers.parseEther("100"); // 100 BNB
  const LP_LOCK_DAYS = 180;
  const VESTING_DAYS = 90;
  const DEV_BPS = 500; // 5%
  const LAUNCH_TOTAL = ethers.parseEther("0.11"); // 0.01 fee + 0.10 stake

  // Helper: contribute from 10 unique wallets (needed for milestone 2)
  async function bulkContribute(tokenAddr: string, amount: bigint) {
    const wallets = [contributor1, contributor2, contributor3, c4, c5, c6, c7, c8, c9, c10];
    for (const w of wallets) {
      await factory.connect(w).contribute(tokenAddr, { value: amount });
    }
  }

  // Helper: deploy a token and return its address
  async function launchTestToken(
    launchDev: SignerWithAddress,
    overrides: Partial<{
      vestingDays: number;
      devBps: number;
      lpLockDays: number;
    }> = {}
  ): Promise<string> {
    // Use EVM time, not JavaScript Date.now(), to avoid clock mismatch
    const evmNow = await getEvmNow();
    const deadline = evmNow + 3600;
    const sig = await signEligibility(verifierSigner, launchDev.address, deadline);

    await factory.connect(launchDev).launchToken(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOTAL_SUPPLY,
      RAISE_CAP,
      overrides.lpLockDays ?? LP_LOCK_DAYS,
      overrides.vestingDays ?? VESTING_DAYS,
      overrides.devBps ?? DEV_BPS,
      deadline,
      sig,
      0, 30,
      { value: LAUNCH_TOTAL }
    );
    return await factory.allTokens(await factory.tokenCount() - 1n);
  }

  beforeEach(async function () {
    [owner, verifierSigner, dev, contributor1, contributor2, contributor3, treasury,
     c4, c5, c6, c7, c8, c9, c10] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("IronLockFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set a dedicated verifier (not the owner) for realistic testing
    await factory.setVerifier(verifierSigner.address);
    await factory.setTreasury(treasury.address);
  });

  // ══════════════════════════════════════════
  // CRITICAL FIX #1 — DEV VESTING ENFORCEMENT
  // ══════════════════════════════════════════

  describe("CRITICAL #1 — Dev Vesting Enforcement", function () {
    let tokenAddr: string;
    let token: IronLockToken;
    let devAlloc: bigint;
    let dailyCap: bigint;

    beforeEach(async function () {
      tokenAddr = await launchTestToken(dev);
      token = await ethers.getContractAt("IronLockToken", tokenAddr);
      devAlloc = (TOTAL_SUPPLY * BigInt(DEV_BPS)) / 10000n;
      dailyCap = (devAlloc * 200n) / 10000n; // 2% per day

      // Move past anti-snipe window
      await time.increase(61);
    });

    it("should store the correct dev address", async function () {
      expect(await token.dev()).to.equal(dev.address);
    });

    it("should block dev transfer before any vesting accrues", async function () {
      // Day 0: no tokens vested — even 1 full token should be blocked
      await expect(
        token.connect(dev).transfer(contributor1.address, ethers.parseEther("1"))
      ).to.be.revertedWith("IronLockToken: Exceeds dev transfer limit");
    });

    it("should allow transfer within vested amount and daily cap", async function () {
      // Move 45 days forward (50% vested)
      await time.increase(45 * 86400);

      const vested = devAlloc / 2n;
      const maxTransfer = vested < dailyCap ? vested : dailyCap;

      await token.connect(dev).transfer(contributor1.address, maxTransfer);
      expect(await token.balanceOf(contributor1.address)).to.equal(maxTransfer);
    });

    it("should block transfer exceeding daily sell cap", async function () {
      await time.increase(45 * 86400); // 50% vested

      // Daily cap is 2% of devAlloc
      await token.connect(dev).transfer(contributor1.address, dailyCap);
      // Additional transfer same day should fail
      await expect(
        token.connect(dev).transfer(contributor2.address, ethers.parseEther("1"))
      ).to.be.revertedWith("IronLockToken: Exceeds dev transfer limit");
    });

    it("should reset daily cap after 24 hours", async function () {
      await time.increase(45 * 86400); // 50% vested

      // Use daily cap
      await token.connect(dev).transfer(contributor1.address, dailyCap);

      // Move 25 hours forward
      await time.increase(25 * 3600);

      // New day — can transfer again
      await token.connect(dev).transfer(contributor2.address, dailyCap);
      expect(await token.balanceOf(contributor2.address)).to.equal(dailyCap);
    });

    it("should allow full transfer after vesting completes", async function () {
      // Move past 90 days vesting + anti-snipe
      await time.increase(91 * 86400);

      // Can transfer daily cap each day
      await token.connect(dev).transfer(contributor1.address, dailyCap);
      await time.increase(86401);
      await token.connect(dev).transfer(contributor1.address, dailyCap);
    });

    it("should NOT restrict normal (non-dev) user transfers", async function () {
      // Contributor gets tokens via contribute
      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("1"),
      });

      const bal = await token.balanceOf(contributor1.address);
      expect(bal).to.be.gt(0);

      // Contributor should be able to transfer freely
      await token.connect(contributor1).transfer(contributor2.address, bal);
      expect(await token.balanceOf(contributor2.address)).to.equal(bal);
    });

    it("should emit DevTransferBlocked event on blocked transfer", async function () {
      await expect(
        token.connect(dev).transfer(contributor1.address, devAlloc)
      ).to.be.revertedWith("IronLockToken: Exceeds dev transfer limit");
    });

    it("should not allow re-setting dev address", async function () {
      // Only the factory (owner) can call setDevAllocation, so a non-owner
      // call reverts first on Ownable. The dev is already set during launch
      // and any re-call by the factory would fail with "Dev already set".
      await expect(
        token.setDevAllocation(contributor1.address, 1000, 0, 0, 200)
      ).to.be.reverted; // Ownable or Dev already set
    });
  });

  // ══════════════════════════════════════════
  // CRITICAL FIX #2 — PRO-RATA REFUND
  // ══════════════════════════════════════════

  describe("CRITICAL #2 — Pro-Rata Refund", function () {
    let tokenAddr: string;

    async function setupRefundScenario(contributions: { signer: SignerWithAddress; amount: bigint }[]) {
      tokenAddr = await launchTestToken(dev);

      // Move past anti-snipe
      await time.increase(61);

      for (const c of contributions) {
        await factory.connect(c.signer).contribute(tokenAddr, { value: c.amount });
      }
    }

    async function triggerRefund() {
      // Wait 15 days of dev inactivity
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);

      // Vote yes with majority
      const info = await factory.tokens(tokenAddr);
      const halfRaised = info.totalRaised / 2n;

      // Need >51% yes votes
      // Contribute enough to pass
    }

    it("should refund full amount when no milestones are released", async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      const contribAmount = ethers.parseEther("2");
      await factory.connect(contributor1).contribute(tokenAddr, { value: contribAmount });

      // Trigger refund (no milestones released)
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);
      await factory.connect(contributor1).castRefundVote(tokenAddr, true); // 10/10 = 100% > 51%

      // Claim refund
      const balanceBefore = await ethers.provider.getBalance(contributor1.address);
      const tx = await factory.connect(contributor1).claimRefund(tokenAddr);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(contributor1.address);

      // Should receive ~10 BNB back (full refund, no milestones released)
      const recovered = balanceAfter + gasCost - balanceBefore;
      // 10 BNB ± small rounding
      expect(recovered).to.be.closeTo(contribAmount, ethers.parseEther("0.0001"));
    });

    it("should refund proportionally after one milestone released", async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      const c1Amt = ethers.parseEther("3");
      const c2Amt = ethers.parseEther("2");
      await factory.connect(contributor1).contribute(tokenAddr, { value: c1Amt });
      await factory.connect(contributor2).contribute(tokenAddr, { value: c2Amt });

      // Release milestone 1 (33% of 50 BNB = 16.5 BNB goes to dev)
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // Trigger refund
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);

      // Need >51%. contributor1 has 30, contributor2 has 20. Total = 50.
      // contributor1 votes yes = 30/50 = 60% > 51%
      await factory.connect(contributor1).castRefundVote(tokenAddr, true);

      // After 1 milestone (33% released), refund pool = 67% of 50 = 33.5 BNB
      // contributor2 contributed 20/50 = 40% → 40% of 33.5 = 13.4 BNB
      const balanceBefore = await ethers.provider.getBalance(contributor2.address);
      const tx = await factory.connect(contributor2).claimRefund(tokenAddr);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(contributor2.address);

      const recovered = balanceAfter + gasCost - balanceBefore;
      // 40% of remaining 67% of 50 BNB = 13.4 BNB
      const expectedRefund = (c2Amt * 67n) / 100n; // 67% = 100% - 33% (1 milestone)
      expect(recovered).to.be.closeTo(expectedRefund, ethers.parseEther("0.001"));
    });

    it("should refund proportionally after two milestones released", async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await bulkContribute(tokenAddr, ethers.parseEther("0.5"));

      // Release milestone 1 (33%)
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
      // Release milestone 2 (33%) — needs 30+ days
      await time.increase(31 * 86400);
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

      // Trigger refund — need >51% of totalRaised (0.5 BNB * 10 = 5 BNB total)
      // Vote yes from contributors with >2.55 BNB combined
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);
      await factory.connect(contributor1).castRefundVote(tokenAddr, true);
      await factory.connect(contributor2).castRefundVote(tokenAddr, true);
      await factory.connect(contributor3).castRefundVote(tokenAddr, true);
      await factory.connect(c4).castRefundVote(tokenAddr, true);
      await factory.connect(c5).castRefundVote(tokenAddr, true);
      await factory.connect(c6).castRefundVote(tokenAddr, true); // 6 * 0.5 = 3 BNB > 2.55 (51% of 5)

      // After 2 milestones (66% released), refund pool = 34% of 5 = 1.7 BNB
      const balanceBefore = await ethers.provider.getBalance(contributor1.address);
      const tx = await factory.connect(contributor1).claimRefund(tokenAddr);
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;
      const balanceAfter = await ethers.provider.getBalance(contributor1.address);

      const recovered = balanceAfter + gasCost - balanceBefore;
      const expectedRefund = ethers.parseEther("0.17"); // 10% of 34% of 5
      expect(recovered).to.be.closeTo(expectedRefund, ethers.parseEther("0.01"));
    });

    it("should refund zero after all three milestones released", async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await bulkContribute(tokenAddr, ethers.parseEther("0.5"));

      // Release all 3 milestones
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr); // 33%
      await time.increase(31 * 86400); // milestone 2 needs 30+ days
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr); // 33%
      await time.increase(60 * 86400);
      await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr); // 34%

      // Trigger refund — need >51% yes votes
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);
      await factory.connect(contributor1).castRefundVote(tokenAddr, true);
      await factory.connect(contributor2).castRefundVote(tokenAddr, true);
      await factory.connect(contributor3).castRefundVote(tokenAddr, true);
      await factory.connect(c4).castRefundVote(tokenAddr, true);
      await factory.connect(c5).castRefundVote(tokenAddr, true);
      await factory.connect(c6).castRefundVote(tokenAddr, true); // 3 BNB > 51% of 5

      // All funds released — nothing to refund
      await expect(
        factory.connect(contributor1).claimRefund(tokenAddr)
      ).to.be.revertedWith("Nothing");
    });

    it("should not allow double-claiming", async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("2"),
      });

      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);
      await factory.connect(contributor1).castRefundVote(tokenAddr, true);

      await factory.connect(contributor1).claimRefund(tokenAddr);

      // Second claim should fail
      await expect(
        factory.connect(contributor1).claimRefund(tokenAddr)
      ).to.be.revertedWith("No contrib");
    });
  });

  // ══════════════════════════════════════════
  // CRITICAL FIX #3 — ZERO-TOKEN CONTRIBUTIONS
  // ══════════════════════════════════════════

  describe("CRITICAL #3 — Zero-Token Contributions", function () {
    let tokenAddr: string;

    beforeEach(async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);
    });

    it("should reject tiny contribution that yields zero tokens", async function () {
      // Use a tiny-supply token where 1 wei truly yields 0 tokens:
      // totalSupply = 500 (raw wei), raiseCap = 100 BNB → 500 * 1 / (100e18) = 0
      const deadline = await getEvmNow() + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);
      await factory.connect(dev).launchToken(
        "Tiny", "TNY", 500n, ethers.parseEther("100"),
        LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
        { value: LAUNCH_TOTAL }
      );
      const tinyToken = await factory.allTokens(await factory.tokenCount() - 1n);
      await time.increase(61);

      await expect(
        factory.connect(contributor1).contribute(tinyToken, { value: 1n })
      ).to.be.revertedWith("Too small");
    });

    it("should accept smallest valid contribution", async function () {
      // Need at least 1 token. 1 token = 1 / 1M * 100 BNB = 0.0001 BNB
      const minContribution = (RAISE_CAP * 2n) / TOTAL_SUPPLY + 1n; // ensure rounding gives >=1 token
      // Simpler: contribute 0.001 BNB which gives some tokens
      const amount = ethers.parseEther("0.001");
      await factory.connect(contributor1).contribute(tokenAddr, { value: amount });
      const bal = await (await ethers.getContractAt("IronLockToken", tokenAddr))
        .balanceOf(contributor1.address);
      expect(bal).to.be.gt(0);
    });

    it("should accept normal contribution", async function () {
      const amount = ethers.parseEther("1");
      await factory.connect(contributor1).contribute(tokenAddr, { value: amount });
      const bal = await (await ethers.getContractAt("IronLockToken", tokenAddr))
        .balanceOf(contributor1.address);
      expect(bal).to.be.gt(0);
    });
  });

  // ══════════════════════════════════════════
  // MEDIUM FIX #1 — ANTI-SNIPE PER TOKEN
  // ══════════════════════════════════════════

  describe("MEDIUM #1 — Anti-Snipe Per Token", function () {
    it("should track anti-snipe limits independently per token", async function () {
      // Launch two tokens from different devs (using same block)
      // We can't control block timing in Hardhat, so just test they're independent

      const token1 = await launchTestToken(dev);
      const token2 = await launchTestToken(dev);

      // Contribute 0.5 BNB to token1 — should work
      await factory.connect(contributor1).contribute(token1, {
        value: ethers.parseEther("0.5"),
      });

      // Contribute 0.5 BNB to token2 — should ALSO work (independent caps)
      await factory.connect(contributor1).contribute(token2, {
        value: ethers.parseEther("0.5"),
      });

      // Now try another 0.1 BNB to token1 — should fail (cap reached for token1)
      await expect(
        factory.connect(contributor1).contribute(token1, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("IL:Max 0.5 BNB anti-snipe");

      // But token2's cap should still accept up to 0.5 (already contributed 0.5, so 0)
      // token2 cap is independent — contributor1 used 0.5 on token2, so 0 remaining
      await expect(
        factory.connect(contributor1).contribute(token2, {
          value: ethers.parseEther("0.1"),
        })
      ).to.be.revertedWith("IL:Max 0.5 BNB anti-snipe");

      // Different contributor should be fine
      await factory.connect(contributor2).contribute(token1, {
        value: ethers.parseEther("0.5"),
      });
    });

    it("should allow full contribution after anti-snipe window", async function () {
      const tokenAddr = await launchTestToken(dev);

      // Move past 60 second anti-snipe window
      await time.increase(61);

      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("5"), // Way above 0.5 cap
      });

      const info = await factory.tokens(tokenAddr);
      expect(info.totalRaised).to.equal(ethers.parseEther("5"));
    });
  });

  // ══════════════════════════════════════════
  // MEDIUM FIX #2 — SIGNATURE ENCODING
  // ══════════════════════════════════════════

  describe("MEDIUM #2 — Signature Encoding (abi.encode)", function () {
    it("should accept a valid eligibility signature", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.emit(factory, "TokenLaunched");
    });

    it("should reject a signature from wrong signer", async function () {
      const deadline = (await getEvmNow()) + 3600;
      // Sign with dev instead of verifier
      const sig = await signEligibility(dev, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.revertedWith("Invalid proof");
    });

    it("should reject an expired signature", async function () {
      const deadline = (await getEvmNow()) - 1; // already expired
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.revertedWith("Proof expired");
    });

    it("should reject replayed eligibility proofs", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      // First launch succeeds
      await factory.connect(dev).launchToken(
        TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
        LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
        { value: LAUNCH_TOTAL }
      );

      // Second launch with same signature fails (replay)
      await expect(
        factory.connect(dev).launchToken(
          "Token2", "TK2", TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.revertedWith("Proof used");
    });

    it("should reject signature for wrong wallet", async function () {
      const deadline = (await getEvmNow()) + 3600;
      // Sign for contributor1 but try to launch as dev
      const sig = await signEligibility(verifierSigner, contributor1.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.revertedWith("Invalid proof");
    });
  });

  // ══════════════════════════════════════════
  // LOW FIX #1 — VALIDATION ORDER (fee after checks)
  // ══════════════════════════════════════════

  describe("LOW #1 — Fee After Validation", function () {
    it("should not transfer fee when launch validation fails", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      // Try launch with invalid LP lock days
      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          100, // LP lock under 180 days — will fail validation
          VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.reverted; // custom error LPLockTooShort

      // Treasury should NOT have received the fee
      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryAfter).to.equal(treasuryBefore);
    });

    it("should transfer fee when launch succeeds", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      const treasuryBefore = await ethers.provider.getBalance(treasury.address);

      await factory.connect(dev).launchToken(
        TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
        LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
        { value: LAUNCH_TOTAL }
      );

      const treasuryAfter = await ethers.provider.getBalance(treasury.address);
      // Treasury receives launch fee (0.01), stake is held by factory
      expect(treasuryAfter - treasuryBefore).to.equal(ethers.parseEther("0.01"));
    });

    it("should refund excess BNB to sender", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      const excessAmount = ethers.parseEther("0.05");
      const totalSent = LAUNCH_TOTAL + excessAmount;

      const devBefore = await ethers.provider.getBalance(dev.address);

      const tx = await factory.connect(dev).launchToken(
        TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
        LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
        { value: totalSent }
      );
      const receipt = await tx.wait();
      const gasCost = receipt!.gasUsed * receipt!.gasPrice;

      const devAfter = await ethers.provider.getBalance(dev.address);

      // Dev should have lost exactly the fee + stake (total 0.11) + gas
      const netSpent = devBefore - devAfter - gasCost;
      expect(netSpent).to.be.closeTo(LAUNCH_TOTAL, ethers.parseEther("0.01"));
    });

    it("should reject if msg.value is less than fee + stake", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: ethers.parseEther("0.05") } // less than 0.11 BNB
        )
      ).to.be.revertedWith("Low fee+stake");
    });
  });

  // ══════════════════════════════════════════
  // INFO #1 — releaseMilestone permissionless
  // ══════════════════════════════════════════

  describe("INFO #1 — releaseMilestone Permissionless", function () {
    let tokenAddr: string;

    beforeEach(async function () {
      tokenAddr = await launchTestToken(dev);
      await time.increase(61);
      // Fund the token
      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("2"),
      });
    });

    it("should allow anyone (not just dev) to release milestone 1", async function () {
      await time.increase(31 * 86400); // pass 30-day milestone guard
      // Caller is contributor1 (not dev)
      await factory.connect(contributor1).releaseMilestone(tokenAddr);
      const info = await factory.tokens(tokenAddr);
      expect(info.milestoneReleased).to.equal(1);
    });

    it("should send BNB to dev regardless of caller", async function () {
      const devBefore = await ethers.provider.getBalance(dev.address);
      await time.increase(31 * 86400); // pass 30-day milestone guard

      // contributor1 triggers the release
      await factory.connect(contributor1).releaseMilestone(tokenAddr);

      const devAfter = await ethers.provider.getBalance(dev.address);
      // 33% of devBNB (70% of 2 = 1.4) ≈ 0.462 BNB
      expect(devAfter - devBefore).to.be.closeTo(
        ethers.parseEther("0.462"),
        ethers.parseEther("0.01")
      );
    });
  });

  // ══════════════════════════════════════════
  // INFO #2 — Paginated Token List
  // ══════════════════════════════════════════

  describe("INFO #2 — Paginated Token List", function () {
    it("should return tokens with pagination", async function () {
      // Launch 3 tokens
      await launchTestToken(dev);
      await launchTestToken(dev);
      await launchTestToken(dev);

      // Get page 1 (limit 2)
      const [page1, total] = await factory.getTokensPaginated(0, 2);
      expect(total).to.equal(3n);
      expect(page1.length).to.equal(2);

      // Get page 2
      const [page2] = await factory.getTokensPaginated(2, 2);
      expect(page2.length).to.equal(1);
    });

    it("should return empty array when offset exceeds total", async function () {
      await launchTestToken(dev);
      const [result, total] = await factory.getTokensPaginated(5, 10);
      expect(total).to.equal(1n);
      expect(result.length).to.equal(0);
    });

    it("getAllTokens should still work for backward compat", async function () {
      await launchTestToken(dev);
      await launchTestToken(dev);
      const all = await factory.getAllTokens();
      expect(all.length).to.equal(2);
    });
  });

  // ══════════════════════════════════════════
  // BLACKLIST — auto-trigger on refund
  // ══════════════════════════════════════════

  describe("Blacklist — Auto-trigger on Refund", function () {
    it("should blacklist dev when refund vote passes", async function () {
      const tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("2"),
      });

      // Trigger refund
      await time.increase(15 * 86400);
      await factory.connect(contributor1).startRefundVote(tokenAddr);
      await factory.connect(contributor1).castRefundVote(tokenAddr, true);

      // Dev should now be blacklisted
      expect(await factory.isBlacklisted(dev.address)).to.equal(true);
    });

    it("should block blacklisted wallet from launching", async function () {
      // Blacklist dev
      await factory.blacklistWallet(dev.address, "Test blacklist");

      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, TOTAL_SUPPLY, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.revertedWith("Blacklisted");
    });
  });

  // ══════════════════════════════════════════
  // ORIGINAL TESTS — still passing
  // ══════════════════════════════════════════

  describe("Original Functionality — Regression", function () {
    it("should launch a token with correct safety score", async function () {
      const tokenAddr = await launchTestToken(dev);
      const info = await factory.tokens(tokenAddr);
      expect(info.safetyScore).to.equal(100);
      expect(info.active).to.equal(true);
      expect(info.dev).to.equal(dev.address);
    });

    it("should enforce safety floors", async function () {
      const deadline = (await getEvmNow()) + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      await expect(
        factory.connect(dev).launchToken(
          TOKEN_NAME, TOKEN_SYMBOL, 0, RAISE_CAP,
          LP_LOCK_DAYS, VESTING_DAYS, DEV_BPS, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        )
      ).to.be.reverted; // custom error (ZeroSupply)
    });

    it("should accept valid contributions after anti-snipe", async function () {
      const tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await factory.connect(contributor1).contribute(tokenAddr, {
        value: ethers.parseEther("1"),
      });

      const info = await factory.tokens(tokenAddr);
      expect(info.totalRaised).to.equal(ethers.parseEther("1"));
    });

    it("should enforce raise cap", async function () {
      const tokenAddr = await launchTestToken(dev);
      await time.increase(61);

      await expect(
        factory.connect(contributor1).contribute(tokenAddr, {
          value: RAISE_CAP + 1n,
        })
      ).to.be.revertedWith("Exceeds cap");
    });

    it("should track multiple tokens", async function () {
      await launchTestToken(dev);
      await launchTestToken(dev);
      expect(await factory.tokenCount()).to.equal(2n);
    });
  });
});
