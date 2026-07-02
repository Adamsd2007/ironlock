import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

async function getEvmNow(): Promise<number> {
  return (await ethers.provider.getBlock("latest"))!.timestamp;
}
async function signEligibility(signer: ethers.Signer, wallet: string, deadline: number): Promise<string> {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [wallet, deadline]);
  return signer.signMessage(ethers.getBytes(ethers.keccak256(encoded)));
}

describe("MetadataRegistry", function () {
  let factory: any, registry: any;
  let owner: SignerWithAddress, dev: SignerWithAddress, other: SignerWithAddress;

  beforeEach(async function () {
    [owner, dev, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IronLockFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    const Registry = await ethers.getContractFactory("IronLockMetadataRegistry");
    registry = await Registry.deploy(await factory.getAddress());
    await registry.waitForDeployment();

    await factory.setVerifier(owner.address);
    await factory.setTreasury(owner.address);
  });

  async function launchToken(creator: SignerWithAddress): Promise<string> {
    const deadline = await getEvmNow() + 3600;
    const sig = await signEligibility(owner, creator.address, deadline);
    await factory.connect(creator).launchToken(
      "Test", "TST", ethers.parseEther("1000000"), ethers.parseEther("10"),
      180, 90, 500, deadline, sig, 0, 30, { value: ethers.parseEther("0.11") }
    );
    return await factory.allTokens(await factory.tokenCount() - 1n);
  }

  it("creator can set metadata", async function () {
    const token = await launchToken(dev);
    await registry.connect(dev).setMetadata(token, "https://logo.png", "A test token", "https://test.com", "@test", "t.me/test", "meme");
    const meta = await registry.getMetadata(token);
    expect(meta.logoUrl).to.equal("https://logo.png");
    expect(meta.description).to.equal("A test token");
    expect(meta.category).to.equal("meme");
  });

  it("non-creator cannot set metadata", async function () {
    const token = await launchToken(dev);
    await expect(
      registry.connect(other).setMetadata(token, "", "", "", "", "", "meme")
    ).to.be.revertedWith("MR: Not creator");
  });

  it("description over 280 chars reverts", async function () {
    const token = await launchToken(dev);
    const longDesc = "x".repeat(281);
    await expect(
      registry.connect(dev).setMetadata(token, "", longDesc, "", "", "", "meme")
    ).to.be.revertedWith("MR: Desc too long");
  });

  it("invalid category reverts", async function () {
    const token = await launchToken(dev);
    await expect(
      registry.connect(dev).setMetadata(token, "", "", "", "", "", "invalid")
    ).to.be.revertedWith("MR: Bad category");
  });

  it("creator can update metadata", async function () {
    const token = await launchToken(dev);
    await registry.connect(dev).setMetadata(token, "v1.png", "desc1", "", "", "", "meme");
    await registry.connect(dev).setMetadata(token, "v2.png", "desc2", "", "", "", "gaming");
    const meta = await registry.getMetadata(token);
    expect(meta.logoUrl).to.equal("v2.png");
    expect(meta.description).to.equal("desc2");
    expect(meta.category).to.equal("gaming");
  });

  it("unregistered token returns empty metadata", async function () {
    const meta = await registry.getMetadata("0x0000000000000000000000000000000000000001");
    expect(meta.logoUrl).to.equal("");
    expect(meta.description).to.equal("");
  });
});
