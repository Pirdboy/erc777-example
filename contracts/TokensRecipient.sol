// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
import "@openzeppelin/contracts/utils/introspection/ERC1820Implementer.sol";
import "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// ERC777代币接受时的钩子合约
contract TokensRecipient is ERC1820Implementer, IERC777Recipient, Ownable {
    bool private allowTokensReceived;
    using SafeMath for uint256;

    bytes32 private constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    mapping(address => address) public token;
    mapping(address => address) public operator;
    mapping(address => address) public from;
    mapping(address => address) public to;
    mapping(address => uint256) public amount;
    mapping(address => bytes) public data;
    mapping(address => bytes) public operatorData;
    mapping(address => uint256) public balanceOf;

    // ERC1820Registry地址是固定的
    IERC1820Registry internal constant ERC1820_REGISTRY =
        IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);

    constructor(bool _setInterface) {
        if (_setInterface) {
            ERC1820_REGISTRY.setInterfaceImplementer(
                address(this),
                TOKENS_RECIPIENT_INTERFACE_HASH,
                address(this)
            );
        }
        _registerInterfaceForAddress(TOKENS_RECIPIENT_INTERFACE_HASH, msg.sender);
        allowTokensReceived = true;
    }

    function tokensReceived(
        address _operator,
        address _from,
        address _to,
        uint256 _amount,
        bytes calldata _data,
        bytes calldata _operatorData
    ) external override {
        require(allowTokensReceived, "Receive not allowed");
        token[_from] = msg.sender;
        operator[_from] = _operator;
        from[_from] = _from;
        to[_from] = _to;
        amount[_from] = amount[_from].add(_amount);
        data[_from] = _data;
        operatorData[_from] = _operatorData;
        balanceOf[_from] = IERC777(msg.sender).balanceOf(_from);
        balanceOf[_to] = IERC777(msg.sender).balanceOf(_to);
    }

    function acceptTokens() public onlyOwner {
        allowTokensReceived = true;
    }

    function rejectTokens() public onlyOwner {
        allowTokensReceived = false;
    }
}
