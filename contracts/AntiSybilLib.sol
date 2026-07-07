// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title AntiSybilLib — contribution limit checks for IronLockFactory
library AntiSybilLib {
    error ExceedsPerWalletCap(uint256 total, uint256 max);
    error MaxAntiSnipeBNB(uint256 total, uint256 max);

    function checkContributionLimits(
        uint256 currentContrib,
        uint256 incoming,
        uint256 maxPerWallet,
        uint256 antiSnipeMax,
        uint256 antiSnipeContrib,
        uint256 antiSnipeEnd
    ) internal view {
        if (currentContrib + incoming > maxPerWallet) revert ExceedsPerWalletCap(currentContrib + incoming, maxPerWallet);
        if (block.timestamp < antiSnipeEnd) {
            if (antiSnipeContrib + incoming > antiSnipeMax) revert MaxAntiSnipeBNB(antiSnipeContrib + incoming, antiSnipeMax);
        }
    }
}
