// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title IronLockToken
/// @notice ERC20 token with anti-snipe protection and dev transfer limits.
///         The factory is set as owner and enforces safety controls.
contract IronLockToken is ERC20, ERC20Burnable, Ownable {
    // ──────────────────────────────────────
    // State
    // ──────────────────────────────────────

    /// @notice The developer wallet — subject to vesting and daily sell cap.
    ///         Set once by the factory during launch, immutable thereafter.
    address public dev;

    /// @notice Timestamp after which anti-snipe window ends (set by factory).
    uint256 public antiSnipeEnd;

    /// @notice Total tokens allocated to the dev (set by factory).
    uint256 public devAllocation;

    /// @notice Timestamp when vesting started (set by factory).
    uint256 public vestingStart;

    /// @notice Vesting duration in seconds (set by factory).
    uint256 public vestingDuration;

    /// @notice Max fraction of dev allocation that can be sold per day (in bps: 200 = 2%).
    uint16 public dailySellCapBps;

    /// @notice Amount of dev tokens sold today (tracking via internal accounting).
    uint256 public devSoldToday;

    /// @notice Timestamp of the last daily reset.
    uint256 public lastDailyReset;

    // ──────────────────────────────────────
    // Events
    // ──────────────────────────────────────

    event AntiSnipeUpdated(uint256 endTime);
    event DevAllocationSet(
        address indexed dev_,
        uint256 amount,
        uint256 vestingStart_,
        uint256 vestingDuration_,
        uint16 dailySellCapBps_
    );
    event DevTransferBlocked(address from, address to, uint256 amount, string reason);

    // ──────────────────────────────────────
    // Constructor
    // ──────────────────────────────────────

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address factory_
    )
        ERC20(name_, symbol_)
        Ownable(factory_)
    {
        _mint(address(this), totalSupply_);
    }

    // ──────────────────────────────────────
    // Factory-Only Setters (called at launch)
    // ──────────────────────────────────────

    /// @notice Called by the factory to configure anti-snipe window.
    function setAntiSnipe(uint256 endTime) external onlyOwner {
        antiSnipeEnd = endTime;
        emit AntiSnipeUpdated(endTime);
    }

    /// @notice Called by the factory to configure dev, allocation and vesting.
    /// @dev Sets the developer address once — cannot be changed after launch.
    function setDevAllocation(
        address dev_,
        uint256 amount,
        uint256 vestingStart_,
        uint256 vestingDuration_,
        uint16 dailySellCapBps_
    ) external onlyOwner {
        require(dev == address(0), "IronLockToken: Dev already set");
        require(dev_ != address(0), "IronLockToken: Zero dev address");
        dev = dev_;
        devAllocation = amount;
        vestingStart = vestingStart_;
        vestingDuration = vestingDuration_;
        dailySellCapBps = dailySellCapBps_;
        lastDailyReset = vestingStart_;
        emit DevAllocationSet(dev_, amount, vestingStart_, vestingDuration_, dailySellCapBps_);
    }

    /// @notice Transfer tokens held by this contract to contributors / pair (called by factory).
    /// @dev Replaces the removed mint() — all token allocation comes from the pre-minted supply.
    function factoryTransfer(address to, uint256 amount) external onlyOwner {
        _transfer(address(this), to, amount);
    }

    // ──────────────────────────────────────
    // Transfer Override (enforces safety)
    // ──────────────────────────────────────

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // Minting / burning pass through unchecked
        if (from == address(0) || to == address(0)) {
            super._update(from, to, value);
            return;
        }

        // ── Anti-Snipe Check ─────────────────
        // Enforced by AntiSybilLib.checkContributionLimits()
        // in the factory's contribute() function.
        // No per-transfer check needed at token level.

        // ── Dev Transfer Limit ───────────────
        // FIX: Check against the actual dev address, not the factory owner.
        // Previously checked `from == owner()` which only restricted factory
        // transfers — never the dev's own transfers. Now correctly enforces
        // vesting + daily sell cap on the developer wallet.
        if (from == dev && devAllocation > 0) {
            // Reset daily counter
            if (block.timestamp >= lastDailyReset + 1 days) {
                devSoldToday = 0;
                lastDailyReset = block.timestamp;
            }

            // Check vested amount, net of prior transfers
            uint256 vested = _vestedAmount();
            uint256 devBalance = balanceOf(dev);
            uint256 previouslyTransferred = devAllocation > devBalance ? devAllocation - devBalance : 0;
            uint256 transferableVested = vested > previouslyTransferred ? vested - previouslyTransferred : 0;
            uint256 maxTransferable = transferableVested < devBalance ? transferableVested : devBalance;

            // Check daily cap
            uint256 dailyCap = (devAllocation * dailySellCapBps) / 10000;
            uint256 remainingToday = dailyCap > devSoldToday ? dailyCap - devSoldToday : 0;

            uint256 effectiveCap = maxTransferable < remainingToday ? maxTransferable : remainingToday;

            if (value > effectiveCap) {
                emit DevTransferBlocked(from, to, value, "Exceeds dev transfer limit");
                revert("IronLockToken: Exceeds dev transfer limit");
            }

            devSoldToday += value;
        }

        super._update(from, to, value);
    }

    // ──────────────────────────────────────
    // Internal Helpers
    // ──────────────────────────────────────

    /// @notice Compute the amount of dev tokens currently vested.
    function _vestedAmount() internal view returns (uint256) {
        if (block.timestamp < vestingStart) return 0;
        if (block.timestamp >= vestingStart + vestingDuration) return devAllocation;
        return (devAllocation * (block.timestamp - vestingStart)) / vestingDuration;
    }

    /// @notice Public view: how many dev tokens are currently vested.
    function vestedAmount() external view returns (uint256) {
        return _vestedAmount();
    }
}
