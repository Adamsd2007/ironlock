// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

interface IIronLockFactory {
    function tokens(address) external view returns (
        address tokenAddress, address dev, string memory name, string memory symbol,
        uint256 totalSupply, uint256 raiseCap, uint256 totalRaised,
        uint256 lpLockDays, uint256 vestingDays, uint16 devAllocationBps,
        uint256 launchTime, uint256 antiSnipeEnd,
        uint8 milestoneReleased, uint256 milestone1Time, uint256 milestone2Time, uint256 milestone3Time,
        uint8 safetyScore, bool active, bool refundVoteActive,
        uint256 maxContributionPerWallet, uint256 uniqueContributorCount,
        uint16 liquidityBps, uint256 liquidityBNB, uint256 devBNB,
        uint256 softCap, uint256 presaleEnd, bool softCapHit, bool autoRefunded
    );
}

contract IronLockMetadataRegistry {
    struct TokenMetadata {
        string logoUrl;
        string description;
        string website;
        string twitter;
        string telegram;
        string category;
    }

    IIronLockFactory public immutable factory;
    mapping(address => TokenMetadata) private _metadata;

    event MetadataUpdated(address indexed token, address indexed updater);

    constructor(address _factory) { factory = IIronLockFactory(_factory); }

    modifier onlyCreator(address tokenAddr) {
        (, address dev,,,,,,,,,,,,,,,,,,,,,,,,,,) = factory.tokens(tokenAddr);
        require(msg.sender == dev, "MR: Not creator");
        _;
    }

    function setMetadata(
        address tokenAddr, string calldata logoUrl, string calldata description,
        string calldata website, string calldata twitter, string calldata telegram,
        string calldata category
    ) external onlyCreator(tokenAddr) {
        require(bytes(description).length <= 280, "MR: Desc too long");
        require(_validCat(category), "MR: Bad category");
        _metadata[tokenAddr] = TokenMetadata(logoUrl, description, website, twitter, telegram, category);
        emit MetadataUpdated(tokenAddr, msg.sender);
    }

    function getMetadata(address tokenAddr) external view returns (TokenMetadata memory) {
        return _metadata[tokenAddr];
    }

    function _validCat(string calldata c) internal pure returns (bool) {
        bytes32 h = keccak256(bytes(c));
        return h == keccak256(bytes("meme")) || h == keccak256(bytes("defi"))
            || h == keccak256(bytes("gaming")) || h == keccak256(bytes("other"));
    }
}
