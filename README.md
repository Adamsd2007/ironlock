# IronLock — Rugpull-Proof Memecoin Launchpad

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Tests](https://img.shields.io/badge/Tests-51%2F51%20Passing-brightgreen)
![Solidity](https://img.shields.io/badge/Solidity-0.8.28-363636)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black)
![BNB Chain](https://img.shields.io/badge/BNB%20Chain-Testnet-F0B90B)

**IronLock is a memecoin launchpad where rugpulls are technically impossible — safety features are hardcoded into the smart contract itself, not admin-controlled toggles.**

---

## 🔗 Quick Links

| | |
|---|---|
| Website | https://ironlock.xyz |
| Launch App | https://ironlock.xyz/launch |
| Explore Tokens | https://ironlock.xyz/explore |
| GitHub | https://github.com/Adamsd2007/ironlock |
| Twitter | https://x.com/IronLockxyz |
| Telegram | https://t.me/ironlock |

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Why IronLock?](#-why-ironlock)
- [Features](#-features)
- [Architecture](#️-architecture)
- [Smart Contracts](#-smart-contracts)
- [Frontend](#-frontend)
- [Security](#-security)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Tech Stack](#️-tech-stack)
- [Installation](#-installation)
- [Grant Application](#-grant-application)
- [Roadmap](#️-roadmap)
- [License](#-license)

---

## 🎯 Overview

IronLock is a token launchpad built exclusively for the BNB Chain ecosystem. Unlike traditional launchpads where safety features are optional or can be disabled by admins, IronLock hardcodes all safety features into the smart contract itself — making them immutable and trustless.

Every token launched on IronLock inherits:

- 🔒 180+ day LP locks (immutable)
- ⏳ 90-day linear dev vesting (enforced)
- 🛡️ Anti-snipe protection (60 seconds, 0.5 BNB cap)
- ⚡ Milestone-based fund release (33/33/34%)
- 💰 Community refund votes (if dev goes inactive)
- 👨‍💻 Developer reputation system (trust score)

---

## ❓ Why IronLock?

### The Problem

Memecoins are one of the most common vectors for rugpulls in crypto. The core issue isn't memecoins themselves — it's the lack of trustless, enforced safety mechanisms at the contract level.

### The Solution

IronLock makes rugpulls harder to execute by:

- Hardcoding safety features — no admin can override them
- Making LP locks immutable — tokens cannot be withdrawn early
- Vesting dev tokens linearly — prevents instant dumps
- Enabling community refund votes — buyers can reclaim funds if a dev abandons the project
- Publishing on-chain trust scores — full transparency per token

---

## 🚀 Features

### For Token Creators

| Feature | Description |
|---|---|
| 🔒 LP Lock | Liquidity locked for a minimum of 180 days (hardcoded) |
| ⏳ Dev Vesting | Developer tokens release linearly over 90 days |
| 🛡️ Anti-Snipe | First 60s: max 0.5 BNB per wallet |
| ⚡ Milestone Releases | 33/33/34% released at launch, day 30, day 90 |
| 🎯 Softcap | Minimum raise threshold (configurable, 20–100%) |
| 📊 Trust Score | 0–100 score based on safety parameters chosen |
| 💰 Dev Stake | 0.1 BNB stake, refundable after full lifecycle completion |

### For Buyers/Investors

| Feature | Description |
|---|---|
| 🛡️ Buyer Protection | Pro-rata refunds if a dev goes inactive |
| 💰 Refund Votes | Community can vote to refund remaining funds |
| 📊 Transparency | All funds tracked on-chain, verifiable independently |
| 👨‍💻 Dev Reputation | View a developer's launch/refund history before investing |
| 📈 Trust Score | Clear, contract-derived safety rating per token |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          Users                               │
│           (Token Creators & Buyers)                         │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│                    Frontend (Next.js)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Launch  │ │ Explore │ │ Token   │ │ Scan    │          │
│  │ Wizard  │ │ Page    │ │ Page    │ │ Wallet  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│                    API Layer (Next.js)                      │
│  ┌─────────────────┐ ┌─────────────────┐                   │
│  │ Eligibility API │ │ Reputation API  │                   │
│  └─────────────────┘ └─────────────────┘                   │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│              Smart Contracts (Solidity)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              IronLockFactory.sol                     │    │
│  │  (Deploys tokens, manages LP locks, refund votes)   │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            IronLockToken.sol (ERC20)                │    │
│  │  (Vesting, daily sell cap, anti-snipe)             │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           MetadataRegistry.sol                      │    │
│  │  (Stores token metadata)                           │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌───────────────────┐  ┌───────────────────┐               │
│  │  PresaleLib.sol   │  │  AntiSybilLib.sol │               │
│  └───────────────────┘  └───────────────────┘               │
└─────────────────────┬───────────────────────────────────────┘
                       │
┌─────────────────────▼───────────────────────────────────────┐
│                   BNB Chain (BSC)                           │
│              Testnet: Chain ID 97                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Smart Contracts

### `IronLockFactory.sol`

The main contract that manages all token launches, contributions, milestones, and refund logic.

**Key functions:**

```solidity
function launchToken(...) external payable returns (address)
function contribute(address token) external payable
function releaseMilestone(address token) external
function startRefundVote(address token) external
function castRefundVote(address token, bool voteYes) external
function claimRefund(address token) external
function claimDevStake(address token) external
function checkLaunchSuccess(address token) external
function addLiquidityToPancakeSwap(address token) external
function claimLPTokens(address token) external
```

**Read-only getters used by the frontend:**

```solidity
function getContribution(address token, address user) external view returns (uint256)
function isRefundVoteActive(address token) external view returns (bool)
function getContributorCount(address token) external view returns (uint256)
function getDevStats(address dev) external view returns (uint256, uint256, uint256)
function treasury() external view returns (address)
```

### `IronLockToken.sol`

ERC20 token with built-in safety features.

- ✅ Dev vesting (linear over 90 days)
- ✅ Daily sell cap (2% of dev allocation)
- ✅ Anti-snipe protection (60s window)
- ✅ Only the Factory can mint
- ✅ No admin override

### `MetadataRegistry.sol`

Stores token metadata off-chain-adjacent data on-chain.

- ✅ Stores logo URL, description, social links
- ✅ Only the token creator can update their own entry
- ✅ Readable by anyone

### `PresaleLib.sol` / `AntiSybilLib.sol`

Shared library logic for presale duration/softcap validation, token amount calculation, milestone math, and anti-snipe / per-wallet contribution limit checks — kept separate from the Factory to reduce contract size and centralize reusable math.

---

## 💻 Frontend

| Page | Description |
|---|---|
| Home | Hero, live stats, how-it-works, trust stats |
| Launch | Multi-step wizard, eligibility check, image upload, softcap configuration |
| Explore | Token grid, trust badge, LP status badge, refund calculator, filters |
| Token | LP status panel, fund accounting, dev transparency, contribute, refund |
| Scan | Wallet risk scanner (GoPlus + BscScan checks) |
| Dashboard | My Launches, My Investments, personal stats |
| Dev Profile | Developer reputation, launch history |

**Key components:** Trust Badge (0–100 score), LP Status Panel, Refund Calculator, Dev Transparency Panel, Fund Accounting Panel, Progress Indicators.

---

## 🔒 Security

### Access Control

| Feature | Implementation |
|---|---|
| `onlyOwner` | Factory owner can set launch fee, treasury, verifier, and manage the blacklist |
| Dev-gated actions | Milestone releases and stake claims are tied to `msg.sender == dev` |
| Reentrancy guards | `nonReentrant` on all payable/state-changing functions |
| Signature verification | OpenZeppelin ECDSA + deadline + replay protection for eligibility proofs |
| Anti-Sybil | Dev is auto-blocked from contributing to their own presale; per-wallet contribution caps; 5-report threshold auto-blocks a wallet |
| Anti-snipe | 60-second window after launch, 0.5 BNB max contribution per wallet during that window |

### A vulnerability we found and fixed ourselves

During our own edge-case testing, we discovered that `checkLaunchSuccess()` — a permissionless function callable by anyone — set `active = false` on a token, which silently blocked `claimDevStake()` (which required `active == true`). This meant a legitimate developer could have their 0.1 BNB stake **permanently locked** if anyone else called `checkLaunchSuccess()` before the dev claimed their stake — including a malicious actor front-running the dev deliberately.

**Fix:** We replaced the `active`-dependent check in `claimDevStake()` with a direct guard against `refundVotes[tokenAddr].executed`, and added an explicit `milestoneReleased == 3` requirement to `checkLaunchSuccess()` itself, closing the ordering race at the source rather than patching around it. We then added a dedicated regression test simulating the exact race (a non-dev calling `checkLaunchSuccess()` first) to confirm the dev could still successfully claim their stake afterward.

We're documenting this openly because catching and fixing a real fund-lock bug before mainnet — with a test proving the fix — is more meaningful evidence of security rigor than a report with no findings at all.

### What hasn't happened yet (honest status)

- **No external/third-party audit yet.** All testing to date is our own, via automated Hardhat simulation scripts. We plan to pursue an external audit (community contest or professional auditor) before mainnet deployment.
- **Testnet only.** Nothing described here has been deployed to BSC mainnet.

---

## 🧪 Testing

We test via two Hardhat scripts that simulate full on-chain lifecycles end-to-end, rather than isolated unit tests alone — this is designed to catch integration and ordering bugs, not just function-level logic errors.

| Script | Steps | Coverage |
|---|---|---|
| `scripts/simulate.ts` | 24/24 ✅ | Happy path: deploy → launch → 3 contributions → `getContribution`/`getContributorCount` checks → milestone 1 release → refund vote (80% yes, auto-executes at 51%) → claim refund → post-refund state checks |
| `scripts/simulate-edge-cases.ts` | 27/27 ✅ | Edge cases: LP add → 180-day lock → claim after unlock; refund vote at 10% yes (does **not** auto-execute); double-vote revert; non-contributor vote revert; anti-snipe cap enforcement (0.6 BNB rejected, 0.3 BNB accepted); 5-report Sybil auto-block; full 3-milestone release + `claimDevStake` + `checkLaunchSuccess`, including the race-condition regression test described above |

**Total: 51/51 steps passing**, run against both a local Hardhat network and the live verified BSC testnet deployment.

Run them yourself:

```bash
npm run hh:simulate
npm run hh:simulate-edge
```

Or against the live testnet contracts directly:

```bash
cross-env TS_NODE_PROJECT=tsconfig.hardhat.json hardhat run scripts/simulate.ts --network bscTestnet
```

---

## 🚀 Deployment

### Testnet Deployment (BSC)

```
Chain:          BSC Testnet
Chain ID:       97
Factory:        0xaf5c0A56d6dfdff492bE753EB044c49322FF33fb
Registry:       0x050dEbCD0751ea064d700874984B2afE06AEAa16
PancakeSwap:    0xD99D1c33F9fC3444f8101754aBC46c52416550D1 (testnet router)
```

Both contracts are **verified** on BscScan Testnet:

- [IronLockFactory — View on BscScan](https://testnet.bscscan.com/address/0x05b93a7123AdEE178a71f790A7De5C9B48249862#code)
- [MetadataRegistry — View on BscScan](https://testnet.bscscan.com/address/ 0x480B218E3dE3CE05EE6AEdC102ae85C4e1F47a64#code)

> **Note:** The PancakeSwap router address above is the testnet router. Mainnet deployment will point to PancakeSwap's official mainnet router.

### How to Reproduce This Deployment

```bash
npm install
npm run hh:compile
npm run hh:deploy
npm run hh:verify -- <FACTORY_ADDRESS>
npm run hh:verify -- <METADATA_REGISTRY_ADDRESS> <FACTORY_ADDRESS>
```

Requires a `.env` file with:

```
PRIVATE_KEY=your_deployer_private_key
BSC_TESTNET_RPC=https://bsc-testnet-rpc.publicnode.com
BSCSCAN_API_KEY=your_bscscan_api_key
```

**⚠️ Never commit `.env` or `.env.local` files. Only `.env.example` (with placeholder values) belongs in version control.**

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 14.2.35 | React framework |
| TypeScript | 5.0+ | Type safety |
| Tailwind CSS | 3.3+ | Styling |
| Wagmi | 2.x | Ethereum hooks |
| RainbowKit | 2.x | Wallet connection |
| React Hook Form | 7.x | Form handling |
| React Hot Toast | 2.x | Notifications |

### Smart Contracts

| Technology | Version | Purpose |
|---|---|---|
| Solidity | 0.8.28 | Smart contract language |
| Hardhat | 2.x | Development framework |
| OpenZeppelin | 4.x | Security-audited base contracts |
| Ethers.js | 6.x | Ethereum interaction |

### API Routes

| Route | Purpose |
|---|---|
| `/api/check-eligibility` | Wallet eligibility check |
| `/api/dev-reputation` | Developer reputation score |
| `/api/wallet-security-check` | External wallet security check (GoPlus/BscScan) |

### Blockchain

| Network | Purpose |
|---|---|
| BSC Testnet (97) | Development & testing (current) |
| BSC Mainnet (56) | Production (post-grant) |

---

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Git
- MetaMask or similar wallet

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Adamsd2007/ironlock.git
cd ironlock

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your own values — never commit this file

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000
```

### Smart Contract Setup

```bash
# Compile contracts
npm run hh:compile

# Run simulation test suites
npm run hh:simulate
npm run hh:simulate-edge

# Deploy to testnet
npm run hh:deploy

# Verify on BscScan
npm run hh:verify -- <CONTRACT_ADDRESS>
```

---

## 🎯 Grant Application

### Why IronLock

| Criteria | IronLock's Status |
|---|---|
| Innovation | Launchpad with hardcoded, non-overridable safety mechanisms rather than admin-toggled features |
| Technical Rigor | 51/51 automated lifecycle + edge-case test steps; one real vulnerability found and fixed pre-launch, with a regression test proving the fix |
| Security Posture | Self-tested and documented; no external audit yet — planned before mainnet |
| Transparency | Verified contracts on BscScan, open-source repo, honest disclosure of what's tested vs. not yet audited |
| Community Impact | Aims to reduce rugpull losses for memecoin investors on BNB Chain |
| Production Readiness | Live and verified on BSC Testnet; mainnet planned post-grant and post-audit |

### Project Timeline

```
Q3 2026 (Current)
├── ✅ Testnet deployment
├── ✅ Contract verification on BscScan
├── ✅ 51/51 automated test steps passing
├── ✅ Frontend end-to-end integration
├── ✅ Vulnerability found & fixed pre-launch
└── ⬜ Grant application submitted

Q4 2026
├── ⬜ External security audit
├── ⬜ Mainnet deployment (post-audit)
├── ⬜ Community growth
└── ⬜ First live token launches

Q1 2027
├── ⬜ Mobile-friendly UI improvements
├── ⬜ Multi-chain exploration
└── ⬜ DAO governance exploration
```

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Smart contract development
- [x] Automated lifecycle + edge-case testing (51/51 steps)
- [x] Frontend development
- [x] Testnet deployment
- [x] Contract verification on BscScan
- [x] Pre-launch vulnerability found and fixed

### Phase 2: Grant & Growth (In Progress 🚀)
- [ ] Grant application (BNB Chain)
- [ ] External security audit
- [ ] Community building
- [ ] Mainnet deployment

### Phase 3: Scale & Expand
- [ ] Multi-chain exploration
- [ ] Advanced analytics
- [ ] DAO governance

### Phase 4: Ecosystem
- [ ] Partner integrations
- [ ] Developer API
- [ ] Custom launch templates

---

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

```
Copyright (c) 2026 Adamsd2007 / IronLock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) — Smart contract standards
- [Hardhat](https://hardhat.org/) — Development framework
- [Wagmi](https://wagmi.sh/) & [RainbowKit](https://www.rainbowkit.com/) — Wallet integration
- [BNB Chain](https://www.bnbchain.org/) — Blockchain infrastructure
- [PancakeSwap](https://pancakeswap.finance/) — DEX integration

---

**IronLock — Where Rugpulls Go to Die 🛡️**

Contact: [Twitter](https://x.com/IronLockxyz) · [Telegram](https://t.me/ironlock)
