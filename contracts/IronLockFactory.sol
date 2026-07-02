// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./IronLockToken.sol";
import "./PresaleLib.sol";
import "./AntiSybilLib.sol";
import "./AntiSybilLib.sol";

interface IPancakeRouter02 {
    function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
    function factory() external pure returns (address);
    function WETH() external pure returns (address);
}
interface IPancakeFactory { function getPair(address tokenA, address tokenB) external view returns (address pair); }

contract IronLockFactory is Ownable, ReentrancyGuard {
    // ── Constants ──
    uint256 public constant MIN_LP_LOCK_DAYS = 180;
    uint256 public constant MIN_VESTING_DAYS = 90;
    uint256 public constant MAX_DEV_BPS = 1000;
    uint256 public constant ANTI_SNIPE_SECONDS = 60;
    uint256 public constant ANTI_SNIPE_MAX_BNB = 0.5 ether;
    uint16 public constant DAILY_SELL_CAP_BPS = 200;
    uint16 public constant DEFAULT_LIQUIDITY_BPS = 3000;
    uint16 public constant MIN_LIQUIDITY_BPS = 2000;
    uint16 public constant MAX_LIQUIDITY_BPS = 5000;
    uint256 public constant MIN_PRESALE_DAYS = 7;
    uint256 public constant MAX_PRESALE_DAYS = 30;
    uint256 public constant MIN_SOFTCAP_BPS = 2000;
    uint256 public constant ELIGIBILITY_PROOF_TTL = 1 hours;
    uint256 public constant MIN_UNIQUE_CONTRIBUTORS = 10;
    uint256 public constant REPORT_THRESHOLD = 5;

    // ── Structs ──
    struct TokenInfo {
        address tokenAddress; address dev; string name; string symbol;
        uint256 totalSupply; uint256 raiseCap; uint256 totalRaised;
        uint256 lpLockDays; uint256 vestingDays; uint16 devAllocationBps;
        uint256 launchTime; uint256 antiSnipeEnd;
        uint8 milestoneReleased; uint256 milestone1Time; uint256 milestone2Time; uint256 milestone3Time;
        uint8 safetyScore; bool active; bool refundVoteActive;
        uint256 maxContributionPerWallet; uint256 uniqueContributorCount;
        uint16 liquidityBps; uint256 liquidityBNB; uint256 devBNB;
        uint256 softCap; uint256 presaleEnd; bool softCapHit; bool autoRefunded;
    }
    struct RefundVote {
        uint256 startTime; uint256 yesVotes; uint256 totalVotes;
        bool executed; mapping(address => bool) hasVoted;
    }

    // ── Storage ──
    mapping(address => TokenInfo) public tokens;
    address[] public allTokens;
    mapping(address => RefundVote) public refundVotes;
    mapping(address => mapping(address => uint256)) public contributions;
    mapping(address => mapping(address => uint256)) public antiSnipeContribs;
    mapping(address => bool) public isIronLockToken;
    mapping(address => uint256) public devLastActivity;
    address public verifier;
    mapping(uint256 => mapping(address => bool)) public usedEligibilityProofs;
    mapping(address => bool) public isBlacklisted;
    uint256 public launchFee = 0.01 ether;
    uint256 public constant DEV_STAKE_AMOUNT = 0.1 ether;
    mapping(address => uint256) public devStakes;
    uint256 public insurancePool;
    address public treasury;
    address public pancakeRouter;
    mapping(address => address) public tokenLPPair;
    mapping(address => uint256) public lpLockedAmount;
    mapping(address => uint256) public lpUnlockTime;
    mapping(address => bool) public liquidityAdded;
    mapping(address => uint256) public tokenBnbBalance;
    mapping(address => address[]) public devLaunchHistory;
    mapping(address => uint256) public devSuccessfulLaunches;
    mapping(address => uint256) public devRefundedLaunches;
    mapping(address => mapping(address => bool)) public hasContributed;
    mapping(address => mapping(address => bool)) public isBlockedContributor;
    mapping(address => mapping(address => uint256)) public suspiciousReportCount;
    mapping(address => mapping(address => mapping(address => bool))) public hasReported;


    // ── Errors ──
    error LPLockTooShort(); error VestingTooShort(); error DevAllocTooHigh();
    error ZeroSupply(); error ZeroRaiseCap(); error NameSymbolRequired();
    error TokenNotActive(); error NoContribution(); error ExceedsRaiseCap();
    error RouterNotSet(); error LiquidityAlreadyAdded(); error RaiseIncomplete();
    error NoBNBForLiquidity(); error NoTokensForLiquidity(); error LPStillLocked();
    error AlreadyClaimed(); error TokenNotFound(); error OnlyDevCanClaim();

    // ── Events ──
    event TokenLaunched(address indexed token, address indexed dev, string name, string symbol, uint256 totalSupply, uint256 raiseCap, uint256 lpLockDays, uint256 vestingDays, uint16 devAllocationBps, uint8 safetyScore);
    event Contributed(address indexed token, address indexed contributor, uint256 amount);
    event MilestoneReleased(address indexed token, uint8 milestone, uint256 amount);
    event RefundVoteStarted(address indexed token);
    event RefundVoteCast(address indexed token, address indexed voter, uint256 weight);
    event RefundExecuted(address indexed token);
    event DevActivityUpdated(address indexed dev, uint256 timestamp);
    event VerifierUpdated(address indexed newVerifier);
    event BlacklistAdded(address indexed wallet, string reason);
    event LaunchFeeUpdated(uint256 newFee);
    event TreasuryUpdated(address indexed newTreasury);
    event DevStakeSlashed(address indexed dev, uint256 amount);
    event DevStakeClaimed(address indexed dev, uint256 amount);
    event DevReputationUpdated(address indexed dev, uint256 totalLaunches, uint256 successful, uint256 refunded);
    event PancakeRouterUpdated(address indexed router);
    event LiquidityAdded(address indexed token, address indexed pair, uint256 bnbAmount, uint256 tokenAmount, uint256 lpTokens);
    event LiquidityClaimed(address indexed token, address indexed dev, uint256 lpTokens);
    event WalletReported(address indexed token, address indexed reporter, address indexed suspiciousWallet, string reason);
    event WalletBlocked(address indexed token, address indexed wallet);
    event StuckBNBWithdrawn(address indexed to, uint256 amount);
    event SoftCapReached(address indexed token, uint256 totalRaised);

    // ── Constructor ──
    constructor() Ownable(msg.sender) { verifier = msg.sender; treasury = msg.sender; }

    // ── Admin ──
    function setLaunchFee(uint256 _fee) external onlyOwner { launchFee = _fee; emit LaunchFeeUpdated(_fee); }
    function setTreasury(address _t) external onlyOwner { require(_t != address(0)); treasury = _t; emit TreasuryUpdated(_t); }
    function setPancakeRouter(address _r) external onlyOwner { require(_r != address(0)); pancakeRouter = _r; emit PancakeRouterUpdated(_r); }
    function setVerifier(address _v) external onlyOwner { require(_v != address(0)); verifier = _v; emit VerifierUpdated(_v); }
    function blacklistWallet(address w, string calldata r) external onlyOwner { require(w != address(0)); require(!isBlacklisted[w]); isBlacklisted[w] = true; emit BlacklistAdded(w, r); }
    function unblacklistWallet(address w) external onlyOwner { require(isBlacklisted[w]); isBlacklisted[w] = false; }
    function withdrawStuckBNB(uint256 amount) external onlyOwner {
        uint256 encumbered = insurancePool;
        for (uint256 i = 0; i < allTokens.length; i++) {
            encumbered += tokenBnbBalance[allTokens[i]];
            encumbered += devStakes[allTokens[i]];
        }
        uint256 withdrawable = address(this).balance > encumbered
            ? address(this).balance - encumbered
            : 0;
        require(amount <= withdrawable, "Exceeds withdrawable");
        (bool s,) = owner().call{value: amount}("");
        require(s);
        emit StuckBNBWithdrawn(owner(), amount);
    }

    // ── Eligibility ──
    function _checkEligibility(address wallet, uint256 deadline, bytes calldata sig) internal {
        if (deadline == 0) return; // bypass: skip eligibility when deadline=0
        require(block.timestamp <= deadline, "Proof expired");
        require(!usedEligibilityProofs[deadline][wallet], "Proof used");
        bytes32 h = keccak256(abi.encode(wallet, deadline));
        require(ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(h), sig) == verifier, "Invalid proof");
        usedEligibilityProofs[deadline][wallet] = true;
    }

    // ── Launch ──
    function launchToken(string calldata name, string calldata symbol, uint256 totalSupply, uint256 raiseCap, uint256 lpLockDays, uint256 vestingDays, uint16 devAllocationBps, uint256 eligibilityDeadline, bytes calldata eligibilitySignature, uint256 softCapBps, uint256 presaleDays) external payable nonReentrant returns (address) {
        _checkEligibility(msg.sender, eligibilityDeadline, eligibilitySignature);
        require(!isBlacklisted[msg.sender], "Blacklisted");
        uint256 req = launchFee + DEV_STAKE_AMOUNT;
        require(msg.value >= req, "Low fee+stake");
        if (lpLockDays < MIN_LP_LOCK_DAYS) revert LPLockTooShort();
        if (vestingDays < MIN_VESTING_DAYS) revert VestingTooShort();
        if (devAllocationBps > MAX_DEV_BPS) revert DevAllocTooHigh();
        if (totalSupply == 0) revert ZeroSupply();
        if (raiseCap == 0) revert ZeroRaiseCap();
        if (bytes(name).length == 0 || bytes(symbol).length == 0) revert NameSymbolRequired();
        PresaleLib.validateDuration(presaleDays, MIN_PRESALE_DAYS, MAX_PRESALE_DAYS);
        if (softCapBps > 0) PresaleLib.validateSoftcap(softCapBps, MIN_SOFTCAP_BPS, 10000);

        uint8 score = 0;
        if (lpLockDays >= 180) score += 20;
        if (vestingDays >= 90) score += 20;
        if (devAllocationBps <= 500) score += 20;
        score += 20; score += 20;

        IronLockToken token = new IronLockToken(name, symbol, totalSupply, address(this));
        uint256 devAmount = (totalSupply * devAllocationBps) / 10000;
        token.setDevAllocation(msg.sender, devAmount, block.timestamp, vestingDays * 1 days, DAILY_SELL_CAP_BPS);
        token.setAntiSnipe(block.timestamp + ANTI_SNIPE_SECONDS);
        token.mint(msg.sender, devAmount);

        tokens[address(token)] = TokenInfo({
            tokenAddress: address(token), dev: msg.sender, name: name, symbol: symbol,
            totalSupply: totalSupply, raiseCap: raiseCap, totalRaised: 0,
            lpLockDays: lpLockDays, vestingDays: vestingDays, devAllocationBps: devAllocationBps,
            launchTime: block.timestamp, antiSnipeEnd: block.timestamp + ANTI_SNIPE_SECONDS,
            milestoneReleased: 0, milestone1Time: block.timestamp,
            milestone2Time: block.timestamp + 30 days, milestone3Time: block.timestamp + 90 days,
            safetyScore: score, active: true, refundVoteActive: false,
            maxContributionPerWallet: raiseCap / 20, uniqueContributorCount: 0,
            liquidityBps: DEFAULT_LIQUIDITY_BPS, liquidityBNB: 0, devBNB: 0,
            softCap: (raiseCap * softCapBps) / 10000, presaleEnd: block.timestamp + (presaleDays * 1 days),
            softCapHit: false, autoRefunded: false
        });

        isBlockedContributor[address(token)][msg.sender] = true;
        isIronLockToken[address(token)] = true;
        allTokens.push(address(token));
        devLaunchHistory[msg.sender].push(address(token));
        devLastActivity[msg.sender] = block.timestamp;

        uint256 excess = msg.value - req;
        if (launchFee > 0) { (bool fs,) = treasury.call{value: launchFee}(""); require(fs); }
        devStakes[address(token)] = DEV_STAKE_AMOUNT;
        if (excess > 0) { (bool rf,) = msg.sender.call{value: excess}(""); require(rf); }
        emit TokenLaunched(address(token), msg.sender, name, symbol, totalSupply, raiseCap, lpLockDays, vestingDays, devAllocationBps, score);
        return address(token);
    }

    // ── Contribute ──
    function contribute(address tokenAddr) external payable nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        require(info.active, "Token not active");
        require(block.timestamp < info.presaleEnd, "Presale ended");
        require(!info.autoRefunded, "Auto-refunded");
        require(msg.value > 0, "No contribution");
        require(!liquidityAdded[tokenAddr], "LP already added");
        require(info.totalRaised + msg.value <= info.raiseCap, "Exceeds cap");
        // Library: anti-snipe + max-per-wallet checks
        AntiSybilLib.checkContributionLimits(contributions[tokenAddr][msg.sender], msg.value, info.maxContributionPerWallet, ANTI_SNIPE_MAX_BNB, antiSnipeContribs[tokenAddr][msg.sender], info.antiSnipeEnd);
        if (block.timestamp < info.antiSnipeEnd) antiSnipeContribs[tokenAddr][msg.sender] += msg.value;
        if (!isBlockedContributor[tokenAddr][msg.sender]) { /* OK */ } else revert("Blocked");

        if (!hasContributed[tokenAddr][msg.sender]) { hasContributed[tokenAddr][msg.sender] = true; info.uniqueContributorCount++; }
        contributions[tokenAddr][msg.sender] += msg.value;
        info.totalRaised += msg.value;
        tokenBnbBalance[tokenAddr] += msg.value;

        if (!info.softCapHit && info.totalRaised >= info.softCap) { info.softCapHit = true; emit SoftCapReached(tokenAddr, info.totalRaised); }

        IronLockToken token = IronLockToken(tokenAddr);
        uint256 tokenAmount = PresaleLib.calcTokenAmount(info.totalSupply, msg.value, info.raiseCap);
        require(tokenAmount > 0, "Too small");
        require(token.balanceOf(address(token)) >= tokenAmount, "Low tokens");
        token.factoryTransfer(msg.sender, tokenAmount);
        if (msg.sender == info.dev) devLastActivity[msg.sender] = block.timestamp;
        emit Contributed(tokenAddr, msg.sender, msg.value);
    }

    // ── Milestones ──
    function releaseMilestone(address tokenAddr) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        require(info.active, "Token not active");
        require(
            info.totalRaised >= info.raiseCap || block.timestamp >= info.launchTime + 30 days,
            "Raise incomplete"
        );
        if (info.softCap > 0) require(info.softCapHit, "Softcap not hit");
        require(!info.autoRefunded, "Was refunded");
        uint8 next = info.milestoneReleased + 1;
        require(next <= 3, "All released");
        uint256 releaseTime; uint256 releaseBps;
        if (next == 1) { releaseTime = info.milestone1Time; releaseBps = 3300; }
        else if (next == 2) { releaseTime = info.milestone2Time; releaseBps = 3300; }
        else { releaseTime = info.milestone3Time; releaseBps = 3400; }
        require(block.timestamp >= releaseTime, "Not yet");
        require(!info.refundVoteActive, "Vote active");
        if (next == 2) require(info.uniqueContributorCount >= MIN_UNIQUE_CONTRIBUTORS, "Need 10+");
        if (info.devBNB == 0 && info.totalRaised > 0) { uint256 lb = (info.totalRaised * info.liquidityBps) / 10000; info.liquidityBNB = lb; info.devBNB = info.totalRaised - lb; }
        uint256 amount = PresaleLib.calcMilestone(info.devBNB, releaseBps);
        require(amount > 0, "Nothing");
        require(tokenBnbBalance[tokenAddr] >= amount, "Low bal");
        tokenBnbBalance[tokenAddr] -= amount;
        info.milestoneReleased = next;
        devLastActivity[info.dev] = block.timestamp;
        (bool sent,) = info.dev.call{value: amount}("");
        require(sent, "Xfer failed");
        emit MilestoneReleased(tokenAddr, next, amount);
        emit DevActivityUpdated(info.dev, block.timestamp);
    }

    // ── Refunds ──
    function startRefundVote(address tokenAddr) external {
        TokenInfo storage info = tokens[tokenAddr];
        require(info.active, "Token not active");
        require(!info.refundVoteActive, "Vote active");
        require(block.timestamp >= devLastActivity[info.dev] + 14 days, "Dev active");
        require(info.totalRaised > 0, "No funds");
        info.refundVoteActive = true;
        RefundVote storage v = refundVotes[tokenAddr];
        v.startTime = block.timestamp; v.yesVotes = 0; v.totalVotes = info.totalRaised; v.executed = false;
        emit RefundVoteStarted(tokenAddr);
    }
    function castRefundVote(address tokenAddr, bool voteYes) external {
        TokenInfo storage info = tokens[tokenAddr]; require(info.refundVoteActive, "No vote");
        RefundVote storage v = refundVotes[tokenAddr];
        require(!v.hasVoted[msg.sender], "Already voted"); require(contributions[tokenAddr][msg.sender] > 0, "Not contributor"); require(!v.executed, "Executed");
        v.hasVoted[msg.sender] = true; if (voteYes) v.yesVotes += contributions[tokenAddr][msg.sender];
        emit RefundVoteCast(tokenAddr, msg.sender, voteYes ? contributions[tokenAddr][msg.sender] : 0);
        if (v.yesVotes > (v.totalVotes * 51) / 100) _executeRefund(tokenAddr);
    }
    function executeRefund(address tokenAddr) external {
        TokenInfo storage info = tokens[tokenAddr]; require(info.refundVoteActive, "No vote");
        RefundVote storage v = refundVotes[tokenAddr]; require(!v.executed, "Executed");
        require(v.yesVotes > (v.totalVotes * 51) / 100, "Need 51%");
        _executeRefund(tokenAddr);
    }
    function _executeRefund(address tokenAddr) internal {
        TokenInfo storage info = tokens[tokenAddr]; RefundVote storage v = refundVotes[tokenAddr];
        v.executed = true; info.active = false;
        if (!isBlacklisted[info.dev]) { isBlacklisted[info.dev] = true; emit BlacklistAdded(info.dev, "Refund passed"); }
        uint256 stake = devStakes[tokenAddr]; if (stake > 0) { devStakes[tokenAddr] = 0; insurancePool += stake; emit DevStakeSlashed(info.dev, stake); }
        devRefundedLaunches[info.dev]++;
        emit RefundExecuted(tokenAddr);
    }
    function claimRefund(address tokenAddr) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        require(!info.active, "Active"); require(refundVotes[tokenAddr].executed, "Not executed");
        uint256 c = contributions[tokenAddr][msg.sender]; require(c > 0, "No contrib");
        contributions[tokenAddr][msg.sender] = 0;
        uint256 releasedBps; if (info.milestoneReleased >= 1) releasedBps += 3300; if (info.milestoneReleased >= 2) releasedBps += 3300; if (info.milestoneReleased >= 3) releasedBps += 3400;
        uint256 refundAmount = PresaleLib.computeRefund(c, info.totalRaised, releasedBps);
        require(refundAmount > 0, "Nothing"); require(tokenBnbBalance[tokenAddr] >= refundAmount, "Low bal");
        tokenBnbBalance[tokenAddr] -= refundAmount;
        (bool sent,) = msg.sender.call{value: refundAmount}(""); require(sent, "Refund failed");
    }

    // ── Dev Stake ──
    function claimDevStake(address tokenAddr) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        require(info.dev == msg.sender, "Not dev"); require(info.active, "Not active");
        require(info.milestoneReleased == 3, "Not complete");
        uint256 s = devStakes[tokenAddr]; require(s > 0, "No stake");
        devStakes[tokenAddr] = 0; (bool sent,) = msg.sender.call{value: s}(""); require(sent);
        emit DevStakeClaimed(msg.sender, s);
    }
    function updateDevActivity() external { devLastActivity[msg.sender] = block.timestamp; emit DevActivityUpdated(msg.sender, block.timestamp); }

    // ── Liquidity ──
    function addLiquidityToPancakeSwap(address tokenAddr) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        if (info.dev == address(0)) revert TokenNotFound(); if (pancakeRouter == address(0)) revert RouterNotSet();
        if (liquidityAdded[tokenAddr]) revert LiquidityAlreadyAdded();
        if (!(info.totalRaised >= info.raiseCap || block.timestamp >= info.launchTime + 30 days)) revert RaiseIncomplete();
        liquidityAdded[tokenAddr] = true;
        uint256 bnbAmt = info.liquidityBNB > 0 ? info.liquidityBNB : tokenBnbBalance[tokenAddr];
        if (bnbAmt == 0) revert NoBNBForLiquidity();
        IronLockToken t = IronLockToken(tokenAddr);
        uint256 tokAmt = t.balanceOf(address(t)); if (tokAmt == 0) revert NoTokensForLiquidity();
        t.factoryTransfer(address(this), tokAmt); t.approve(pancakeRouter, tokAmt);
        (uint256 at, uint256 ae, uint256 liq) = IPancakeRouter02(pancakeRouter).addLiquidityETH{value: bnbAmt}(tokenAddr, tokAmt, 0, 0, address(this), block.timestamp + 300);
        address pairAddr = IPancakeFactory(IPancakeRouter02(pancakeRouter).factory()).getPair(tokenAddr, IPancakeRouter02(pancakeRouter).WETH());
        tokenLPPair[tokenAddr] = pairAddr; lpLockedAmount[tokenAddr] = liq;
        lpUnlockTime[tokenAddr] = block.timestamp + (info.lpLockDays * 1 days);
        tokenBnbBalance[tokenAddr] = ae < bnbAmt ? tokenBnbBalance[tokenAddr] - ae : 0;
        emit LiquidityAdded(tokenAddr, pairAddr, ae, at, liq);
    }
    function claimLPTokens(address tokenAddr) external nonReentrant {
        TokenInfo storage info = tokens[tokenAddr];
        if (msg.sender != info.dev) revert OnlyDevCanClaim(); if (!liquidityAdded[tokenAddr]) revert RaiseIncomplete();
        if (block.timestamp < lpUnlockTime[tokenAddr]) revert LPStillLocked();
        if (lpLockedAmount[tokenAddr] == 0) revert AlreadyClaimed();
        uint256 amt = lpLockedAmount[tokenAddr]; lpLockedAmount[tokenAddr] = 0;
        IERC20(tokenLPPair[tokenAddr]).transfer(info.dev, amt);
        emit LiquidityClaimed(tokenAddr, info.dev, amt);
    }

    // ── Sybil Reporting ──
    function reportSuspiciousWallet(address tokenAddr, address suspiciousWallet, string calldata reason) external {
        TokenInfo storage info = tokens[tokenAddr]; require(info.active, "Not active");
        require(suspiciousWallet != address(0)); require(suspiciousWallet != msg.sender);
        require(!hasReported[tokenAddr][msg.sender][suspiciousWallet], "Reported");
        hasReported[tokenAddr][msg.sender][suspiciousWallet] = true;
        suspiciousReportCount[tokenAddr][suspiciousWallet]++;
        emit WalletReported(tokenAddr, msg.sender, suspiciousWallet, reason);
        if (suspiciousReportCount[tokenAddr][suspiciousWallet] >= REPORT_THRESHOLD) {
            isBlockedContributor[tokenAddr][suspiciousWallet] = true; emit WalletBlocked(tokenAddr, suspiciousWallet);
        }
    }

    // ── Views ──
    function getAllTokens() external view returns (address[] memory) { return allTokens; }
    function getTokensPaginated(uint256 offset, uint256 limit) external view returns (address[] memory result, uint256 total) {
        total = allTokens.length; if (offset >= total) return (new address[](0), total);
        uint256 end = offset + limit; if (end > total) end = total;
        result = new address[](end - offset);
        for (uint256 i = offset; i < end; i++) result[i - offset] = allTokens[i];
    }
    function tokenCount() external view returns (uint256) { return allTokens.length; }
    function getSafetyScore(address tokenAddr) external view returns (uint8) { return tokens[tokenAddr].safetyScore; }
    function isRefundVotePassed(address tokenAddr) external view returns (bool) {
        RefundVote storage v = refundVotes[tokenAddr];
        return tokens[tokenAddr].refundVoteActive && !v.executed && v.yesVotes > (v.totalVotes * 51) / 100;
    }
    function getDevLaunchHistory(address d) external view returns (address[] memory) { return devLaunchHistory[d]; }
    function getDevStats(address d) external view returns (uint256 totalLaunches, uint256 successful, uint256 refunded) {
        return (devLaunchHistory[d].length, devSuccessfulLaunches[d], devRefundedLaunches[d]);
    }
    function getTokenAccountingStatus(address tokenAddr) external view returns (uint256 totalRaised, uint256 currentTrackedBalance, uint256 releasedSoFar) {
        TokenInfo storage info = tokens[tokenAddr];
        return (info.totalRaised, tokenBnbBalance[tokenAddr], info.totalRaised - tokenBnbBalance[tokenAddr]);
    }
    function getLPStatus(address tokenAddr) external view returns (bool added, address pair, uint256 lockedAmount, uint256 unlockTime, bool claimable) {
        return (liquidityAdded[tokenAddr], tokenLPPair[tokenAddr], lpLockedAmount[tokenAddr], lpUnlockTime[tokenAddr], liquidityAdded[tokenAddr] && block.timestamp >= lpUnlockTime[tokenAddr] && lpLockedAmount[tokenAddr] > 0);
    }
    function checkLaunchSuccess(address tokenAddr) external {
        TokenInfo storage info = tokens[tokenAddr];
        require(block.timestamp >= info.launchTime + 90 days, "Not 90d");
        require(info.active, "Refunded"); info.active = false;
        devSuccessfulLaunches[info.dev]++;
        emit DevReputationUpdated(info.dev, devLaunchHistory[info.dev].length, devSuccessfulLaunches[info.dev], devRefundedLaunches[info.dev]);
    }
    receive() external payable {}
}
