// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @title AntiSybilLib — contribution limit checks for IronLockFactory
library AntiSybilLib {
    function checkContributionLimits(
        uint256 currentContrib,
        uint256 incoming,
        uint256 maxPerWallet,
        uint256 antiSnipeMax,
        uint256 antiSnipeContrib,
        uint256 antiSnipeEnd
    ) internal view {
        require(currentContrib + incoming <= maxPerWallet, "IL:Exceeds per-wallet cap");
        if (block.timestamp < antiSnipeEnd) {
            require(antiSnipeContrib + incoming <= antiSnipeMax, "IL:Max 0.5 BNB anti-snipe");
        }
    }
}
