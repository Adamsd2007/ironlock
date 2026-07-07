// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title PresaleLib — shared math for IronLockFactory
library PresaleLib {
    error InvalidSoftcap(uint256 bps);
    error InvalidDuration(uint256 days_);

    function computeRefund(uint256 contributed, uint256 totalRaised, uint256 releasedBps) internal pure returns (uint256) {
        uint256 released = (totalRaised * releasedBps) / 10000;
        uint256 refundPool = totalRaised - released;
        return refundPool > 0 && totalRaised > 0 ? (contributed * refundPool) / totalRaised : 0;
    }

    function calcTokenAmount(uint256 totalSupply, uint256 value, uint256 raiseCap) internal pure returns (uint256) {
        return raiseCap > 0 ? (totalSupply * value) / raiseCap : 0;
    }

    function calcMilestone(uint256 devBNB, uint256 bps) internal pure returns (uint256) {
        return (devBNB * bps) / 10000;
    }

    function validateSoftcap(uint256 softCapBps, uint256 minBps, uint256 maxBps) internal pure {
        if (softCapBps < minBps || softCapBps > maxBps) revert InvalidSoftcap(softCapBps);
    }

    function validateDuration(uint256 days_, uint256 minDays, uint256 maxDays) internal pure {
        if (days_ < minDays || days_ > maxDays) revert InvalidDuration(days_);
    }
}
