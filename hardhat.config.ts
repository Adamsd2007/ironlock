import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-gas-reporter";
import "solidity-coverage";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";
const BSC_RPC = process.env.BSC_RPC || "https://bsc-dataseed.binance.org";
const BSC_TESTNET_RPC = process.env.BSC_TESTNET_RPC || "https://bsc-testnet-rpc.publicnode.com";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.25",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
        details: {
          yul: true,
          yulDetails: { stackAllocation: true },
          deduplicate: true,
          cse: true,
          constantOptimizer: true,
        },
      },
      viaIR: true,
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    bscTestnet: {
      url: BSC_TESTNET_RPC,
      chainId: 97,
      accounts: [PRIVATE_KEY],
      gasPrice: 10000000000,
      timeout: 60000,
    },
    bsc: {
      url: BSC_RPC,
      chainId: 56,
      accounts: [PRIVATE_KEY],
      gasPrice: 3000000000, // 3 gwei
    },
  },
  etherscan: {
    apiKey: process.env.BSCSCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "BNB",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  mocha: {
    timeout: 60000,
  },
};

export default config;
