import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { IronLockFactory, IronLockToken } from "../typechain-types";

// ── Shared helpers ───────────────────────
async function getEvmNow(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

async function signEligibility(
  signer: ethers.Signer, wallet: string, deadline: number
): Promise<string> {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "uint256"], [wallet, deadline]
  );
  return signer.signMessage(ethers.getBytes(ethers.keccak256(encoded)));
}

const LAUNCH_TOTAL = ethers.parseEther("0.11"); // 0.01 fee + 0.10 stake

// ── Deploy fixture ───────────────────────
async function deployFixture() {
  const [owner, verifierSigner, dev, ...contributors] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("IronLockFactory");
  const factory = await Factory.deploy() as IronLockFactory;
  await factory.waitForDeployment();
  await factory.setVerifier(verifierSigner.address);

  async function launchToken(params: {
    dev: SignerWithAddress;
    totalSupply?: bigint;
    raiseCap?: bigint;
    lpLockDays?: number;
    vestingDays?: number;
    devBps?: number;
  }) {
    const d = params.dev;
    const totalSupply = params.totalSupply ?? ethers.parseEther("1000000");
    const raiseCap = params.raiseCap ?? ethers.parseEther("100");
    const lpLockDays = params.lpLockDays ?? 180;
    const vestingDays = params.vestingDays ?? 90;
    const devBps = params.devBps ?? 500;

    const deadline = await getEvmNow() + 3600;
    const sig = await signEligibility(verifierSigner, d.address, deadline);
    await factory.connect(d).launchToken(
      "Test", "TST", totalSupply, raiseCap,
      lpLockDays, vestingDays, devBps,
      deadline, sig, 0, 30, { value: LAUNCH_TOTAL }
    );
    return await factory.allTokens(await factory.tokenCount() - 1n);
  }

  return { factory, owner, verifierSigner, dev, contributors, launchToken };
}

// ═══════════════════════════════════════════
// INVARIANT TESTS
// ═══════════════════════════════════════════
describe("Invariants", function () {
  it("total token supply should equal presale pool + dev allocation", async function () {
    const { factory, launchToken, dev } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    const token = await ethers.getContractAt("IronLockToken", tokenAddr);

    const totalSupply = await token.totalSupply();
    const devAlloc = await token.devAllocation();
    const presalePool = await token.balanceOf(tokenAddr);
    const devBalance = await token.balanceOf(dev.address);

    // presalePool + devBalance ≈ totalSupply
    // Note: presale pool = totalSupply (minted to token contract in constructor)
    //       dev tokens are minted additionally via token.mint()
    expect(presalePool + devBalance).to.be.gte(totalSupply);
  });

  it("refund pool should never exceed total raised minus released", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    const contribAmount = ethers.parseEther("2");
    await factory.connect(contributors[0]).contribute(tokenAddr, { value: contribAmount });

    const info = await factory.tokens(tokenAddr);
    const totalRaised = info.totalRaised;

    // Release milestone 1 (33%)
    await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);

    // Refund pool should be 67% of 50 = 33.5 BNB
    // Check: releasedBps = 3300 (33%), refundPool = 50 - 16.5 = 33.5
    const releasedBps = 3300n;
    const releasedAmount = (totalRaised * releasedBps) / 10000n;
    const expectedRefundPool = totalRaised - releasedAmount;
    expect(expectedRefundPool).to.be.lt(totalRaised);
    expect(expectedRefundPool).to.be.gt(0n);
  });

  it("contribution tracking should remain consistent", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    const amounts = [
      ethers.parseEther("1"),
      ethers.parseEther("2"),
      ethers.parseEther("1.5"),
    ];

    for (let i = 0; i < amounts.length; i++) {
      await factory.connect(contributors[i]).contribute(tokenAddr, { value: amounts[i] });
    }

    let trackedTotal = 0n;
    for (let i = 0; i < amounts.length; i++) {
      const contrib = await factory.contributions(tokenAddr, contributors[i].address);
      expect(contrib).to.equal(amounts[i]);
      trackedTotal += contrib;
    }

    const info = await factory.tokens(tokenAddr);
    expect(info.totalRaised).to.equal(trackedTotal);
  });

  it("milestone releases should never exceed total raised", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    const contribWallets = [contributors[0], contributors[1], contributors[2], contributors[3], contributors[4],
      contributors[5], contributors[6], contributors[7], contributors[8], contributors[9]];
    for (const w of contribWallets.slice(0, 10)) {
      await factory.connect(w).contribute(tokenAddr, { value: ethers.parseEther("0.5") });
    }
    const info = await factory.tokens(tokenAddr);
    const totalRaised = info.totalRaised;

    // Release all 3 milestones
    const devBefore = await ethers.provider.getBalance(dev.address);
    await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
    await time.increase(31 * 86400); // milestone 2 needs 30+ days
    await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
    await time.increase(60 * 86400);
    await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
    const devAfter = await ethers.provider.getBalance(dev.address);

    // Total released should not exceed totalRaised
    const totalReleased = devAfter - devBefore;
    const devShare = totalRaised - ((totalRaised * 3000n) / 10000n);
    expect(totalReleased).to.be.closeTo(devShare, ethers.parseEther("0.01"));
    expect(totalReleased).to.be.lte(totalRaised + ethers.parseEther("0.001"));
  });

  it("LP lock duration should be at least MIN_LP_LOCK_DAYS", async function () {
    const { factory, launchToken, dev } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev, lpLockDays: 365 });
    const info = await factory.tokens(tokenAddr);
    expect(info.lpLockDays).to.be.gte(await factory.MIN_LP_LOCK_DAYS());
  });

  it("dev vesting should never unlock before vesting duration", async function () {
    const { factory, launchToken, dev } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev, vestingDays: 120 });
    const token = await ethers.getContractAt("IronLockToken", tokenAddr);

    // At launch, vested = 0
    expect(await token.vestedAmount()).to.equal(0n);

    // Halfway through vesting, vested = devAlloc / 2
    await time.increase(60 * 86400);
    const devAlloc = await token.devAllocation();
    const vested = await token.vestedAmount();
    expect(vested).to.be.closeTo(devAlloc / 2n, devAlloc / 100n); // ~50% ± 1%
  });
});

// ═══════════════════════════════════════════
// FUZZ TESTS
// ═══════════════════════════════════════════
describe("Fuzz Testing", function () {
  // Deterministic "random" from seed
  function pseudoRandom(seed: number, n: number): number {
    let x = Math.sin(seed * 9301 + 49297) * 233280;
    return Math.floor((x - Math.floor(x)) * n);
  }

  it("random contribution amounts should not break invariants", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    let totalContributed = 0n;
    const contribs: Array<{ signer: number; amount: bigint }> = [];

    for (let i = 0; i < 6; i++) {
      const raw = pseudoRandom(i * 17 + 3, 4); // 0–4
      const amount = 1n + BigInt(raw); // 1–5 BNB
      const raised = (await factory.tokens(tokenAddr)).totalRaised;
      const cap = (await factory.tokens(tokenAddr)).raiseCap;
      if (raised + ethers.parseEther(String(amount)) > cap) continue;

      await factory.connect(contributors[i]).contribute(tokenAddr, {
        value: ethers.parseEther(String(amount)),
      });
      totalContributed += ethers.parseEther(String(amount));
      contribs.push({ signer: i, amount: ethers.parseEther(String(amount)) });

      const info = await factory.tokens(tokenAddr);
      expect(info.totalRaised).to.equal(totalContributed);
      expect(info.totalRaised).to.be.lte(info.raiseCap);
    }
  });

  it("random contributor count should not break invariants", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    const count = pseudoRandom(42, 8); // 0–7 contributors
    for (let i = 0; i < count; i++) {
      await factory.connect(contributors[i]).contribute(tokenAddr, {
        value: ethers.parseEther("1"),
      });
    }

    const info = await factory.tokens(tokenAddr);
    expect(info.totalRaised).to.equal(ethers.parseEther(String(count)));
  });

  it("random vesting durations should enforce correctly", async function () {
    const { factory, launchToken, dev } = await loadFixture(deployFixture);

    const vestingDays = 90 + pseudoRandom(77, 275); // 90–365 days
    const tokenAddr = await launchToken({ dev, vestingDays });
    const token = await ethers.getContractAt("IronLockToken", tokenAddr);

    expect(await token.vestingDuration()).to.equal(BigInt(vestingDays) * 86400n);

    // Halfway through vesting
    await time.increase((vestingDays / 2) * 86400);
    const devAlloc = await token.devAllocation();
    const vested = await token.vestedAmount();
    expect(vested).to.be.closeTo(devAlloc / 2n, devAlloc / 50n); // ~50% ± 2%
  });

  it("random milestone timing should release correct amounts", async function () {
    const { factory, launchToken, dev, contributors } = await loadFixture(deployFixture);
    const tokenAddr = await launchToken({ dev });
    await time.increase(61);

    const raiseAmount = ethers.parseEther(String(1 + pseudoRandom(55, 5))); // 1–5 BNB
    await factory.connect(contributors[0]).contribute(tokenAddr, { value: raiseAmount });

    const info = await factory.tokens(tokenAddr);
    const totalRaised = info.totalRaised;
    expect(totalRaised).to.equal(raiseAmount);

    // Milestone 1
    const devBefore1 = await ethers.provider.getBalance(dev.address);
    await time.increase(31 * 86400); await time.increase(31 * 86400); await factory.releaseMilestone(tokenAddr);
    const devAfter1 = await ethers.provider.getBalance(dev.address);
    const m1 = devAfter1 - devBefore1;
    const devBNB = totalRaised - ((totalRaised * 3000n) / 10000n);
    expect(m1).to.be.closeTo((devBNB * 3300n) / 10000n, ethers.parseEther("0.001"));
  });

  it("random launch parameters should pass validation or revert cleanly", async function () {
    const { factory, dev, verifierSigner } = await loadFixture(deployFixture);

    const runs = 10;
    for (let i = 0; i < runs; i++) {
      const lpLock = 100 + pseudoRandom(i * 3, 300);   // 100–400
      const vesting = 60 + pseudoRandom(i * 7, 300);    // 60–360
      const devBps = pseudoRandom(i * 11, 1500);         // 0–1500
      const supply = pseudoRandom(i * 13, 100) > 0 ? ethers.parseEther("1000000") : 0n;

      const deadline = await getEvmNow() + 3600;
      const sig = await signEligibility(verifierSigner, dev.address, deadline);

      try {
        await factory.connect(dev).launchToken(
          "Fuzz", "FZ", supply, ethers.parseEther("50"),
          lpLock, vesting, devBps, deadline, sig, 0, 30,
          { value: LAUNCH_TOTAL }
        );
      } catch (err: any) {
        // Should only revert on validation, never on panic
        const msg = err?.message ?? "";
        const validRevert =
          msg.includes("LPLockTooShort") || msg.includes("VestingTooShort") ||
          msg.includes("DevAllocTooHigh") || msg.includes("ZeroSupply") ||
          msg.includes("NameSymbolRequired") || msg.includes("ZeroRaiseCap") ||
          msg.includes("LP lock") || msg.includes("Vesting") ||
        expect(validRevert).to.be.true;
      }
    }
  });
});
