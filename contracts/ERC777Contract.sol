// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";

contract ERC777Contract is ERC777 {
    constructor(
        string memory name,
        string memory symbol,
        uint totalSupply,
        address[] memory defaultOperators
    ) ERC777(name, symbol, defaultOperators) {
        _mint(msg.sender, totalSupply, "", "");
    }
}
