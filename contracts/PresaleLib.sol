// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title PresaleLib — shared math for IronLockFactory
library PresaleLib {
    /// @notice Compute pro-rata refund amount after milestone releases
    function computeRefund(uint256 contributed, uint256 totalRaised, uint256 releasedBps) internal pure returns (uint256) {
        uint256 released = (totalRaised * releasedBps) / 10000;
        uint256 refundPool = totalRaised - released;
        return refundPool > 0 && totalRaised > 0 ? (contributed * refundPool) / totalRaised : 0;
    }

    /// @notice Calculate token amount from BNB contribution
    function calcTokenAmount(uint256 totalSupply, uint256 value, uint256 raiseCap) internal pure returns (uint256) {
        return raiseCap > 0 ? (totalSupply * value) / raiseCap : 0;
    }

    /// @notice Calculate milestone release amount from devBNB
    function calcMilestone(uint256 devBNB, uint256 bps) internal pure returns (uint256) {
        return (devBNB * bps) / 10000;
    }

    /// @notice Validate softcap parameter
    function validateSoftcap(uint256 softCapBps, uint256 minBps, uint256 maxBps) internal pure {
        require(softCapBps >= minBps && softCapBps <= maxBps, "IL:Invalid softcap");
    }

    /// @notice Validate presale duration
    function validateDuration(uint256 days_, uint256 minDays, uint256 maxDays) internal pure {
        require(days_ >= minDays && days_ <= maxDays, "IL:Invalid duration");
    }
}
