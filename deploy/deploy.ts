import { ethers } from "hardhat";

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  IronLock.xyz — Deploying to BNB Chain");
  console.log("═══════════════════════════════════════\n");

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} BNB\n`);

  // ── Deploy IronLockFactory ─────────────────
  console.log("Deploying IronLockFactory...");
  const Factory = await ethers.getContractFactory("IronLockFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`✅ IronLockFactory deployed to: ${factoryAddress}\n`);

  // ── Verify on BSCScan ─────────────────────
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`Chain ID: ${chainId}`);
  console.log("");

  // ── Set PancakeSwap Router ──────────────
  // Testnet: 0xD99D1c33F9fC3444f8101754aBC46c52416550D1
  // Mainnet: 0x10ED43C718714eb63d5aA57B78B54704E256024E
  const routerAddress = chainId === 56
    ? "0x10ED43C718714eb63d5aA57B78B54704E256024E"
    : "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";
  await factory.setPancakeRouter(routerAddress);
  console.log(`✅ PancakeSwap router set to: ${routerAddress}\n`);

  if (chainId === 56) {
    console.log("To verify on BSCScan:");
    console.log(`  npx hardhat verify --network bsc ${factoryAddress}\n`);
  } else if (chainId === 97) {
    console.log("To verify on BSCScan Testnet:");
    console.log(`  npx hardhat verify --network bscTestnet ${factoryAddress}\n`);
  }

  // ── Summary ───────────────────────────────
  console.log("═══════════════════════════════════════");
  console.log("  Deployment Complete");
  console.log("═══════════════════════════════════════");
  console.log("");
  console.log("Add this to your .env.local:");
  console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  console.log("");

  // ── Save deployment artifact ──────────────
  const fs = require("fs");
  const path = require("path");

  const deploymentInfo = {
    network: network.name,
    chainId: chainId,
    factoryAddress: factoryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  // ── Deploy MetadataRegistry ─────────────
  console.log("Deploying MetadataRegistry...");
  const MetadataRegistry = await ethers.getContractFactory("IronLockMetadataRegistry");
  const registry = await MetadataRegistry.deploy(factoryAddress);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`✅ MetadataRegistry deployed to: ${registryAddress}\n`);

  console.log(`Deployment artifact saved to deployments/${network.name}.json`);
  console.log(`\nAdd to .env.local:`);
  console.log(`NEXT_PUBLIC_METADATA_REGISTRY_ADDRESS=${registryAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
