// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLPToken is ERC20 {
    constructor() ERC20("IronLock LP", "ILP") {}
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}

contract MockPancakeRouter {
    MockLPToken public immutable lpToken;
    address public immutable factoryAddr;
    address public immutable wethAddr;

    constructor() {
        lpToken = new MockLPToken();
        factoryAddr = address(new MockPancakeFactory(address(lpToken)));
        wethAddr = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    }

    function factory() external view returns (address) { return factoryAddr; }
    function WETH() external view returns (address) { return wethAddr; }

    function addLiquidityETH(
        address token, uint256, uint256, uint256, address to, uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        // Transfer tokens from caller (the factory) to us
        IERC20(token).transferFrom(msg.sender, address(this), IERC20(token).balanceOf(msg.sender));
        // Mint LP tokens to the recipient (the factory = to)
        uint256 lpAmount = msg.value + IERC20(token).balanceOf(address(this));
        lpToken.mint(to, lpAmount);
        return (IERC20(token).balanceOf(address(this)), msg.value, lpAmount);
    }
}

contract MockPancakeFactory {
    address public immutable lpAddress;
    constructor(address _lp) { lpAddress = _lp; }
    function getPair(address, address) external view returns (address) { return lpAddress; }
}
