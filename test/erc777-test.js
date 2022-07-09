const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getDeployedERC1820Registry, getERC1820InterfaceHash } = require('erc1820');

const NAME = "ERC777 Test Token";
const SYMBOL = "ETT";
let owner, sender, receiver, operator, operator2;
const initialSupply = ethers.BigNumber.from(10000000);
let erc1820Registry, erc777Contract, tokensRecipient, tokensSender;
let defaultOperators;

describe("ERC777代币", function () {
    it("获取账户", async () => {
        [owner, sender, receiver, operator, operator2] = await ethers.getSigners();
        defaultOperators = [owner.address, operator.address];
    });

    it("部署ERC1820注册表", async () => {
        erc1820Registry = await getDeployedERC1820Registry();
        expect(await erc1820Registry.interfaceHash("ERC777TokensSender")).to.eq('0x29ddb589b1fb5fc7cf394961c1adf5f8c6454761adf795e67fe149f658abe895');
        expect(await erc1820Registry.interfaceHash("ERC777TokensRecipient")).to.eq('0xb281fc8c12954d22544db45de3159a39272895b169a852b314f9cc762e44c53b');
    });

    it("部署ERC777代币", async () => {
        const ERC777Contract = await ethers.getContractFactory("ERC777Contract");
        erc777Contract = await ERC777Contract
            .connect(owner)
            .deploy(NAME, SYMBOL, initialSupply, defaultOperators);
        await erc777Contract.deployed();
        expect(await erc777Contract.name()).to.equal(NAME);
        expect(await erc777Contract.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("部署发送者钩子合约并注册", async () => {
        const TokensSender = await ethers.getContractFactory("TokensSender");
        tokensSender = await TokensSender.connect(sender).deploy(false);
        await tokensSender.deployed();

        const senderInterfaceId = getERC1820InterfaceHash("ERC777TokensSender");
        expect(await erc1820Registry.getInterfaceImplementer(sender.address, senderInterfaceId))
            .to.eq(ethers.constants.AddressZero);
        await erc1820Registry.connect(sender).setInterfaceImplementer(
            sender.address,
            senderInterfaceId,
            tokensSender.address
        );
        expect(await erc1820Registry.getInterfaceImplementer(sender.address, senderInterfaceId))
            .to.eq(tokensSender.address);
    });

    it("部署接受者钩子合约并注册", async () => {
        const TokensRecipient = await ethers.getContractFactory("TokensRecipient");
        tokensRecipient = await TokensRecipient.connect(receiver).deploy(false);
        await tokensRecipient.deployed();

        const recipientInterfaceId = getERC1820InterfaceHash("ERC777TokensRecipient");
        expect(await erc1820Registry.getInterfaceImplementer(receiver.address, recipientInterfaceId))
            .to.eq(ethers.constants.AddressZero);
        await erc1820Registry.connect(receiver).setInterfaceImplementer(
            receiver.address,
            recipientInterfaceId,
            tokensRecipient.address
        );
        expect(await erc1820Registry.getInterfaceImplementer(receiver.address, recipientInterfaceId))
            .to.eq(tokensRecipient.address);
    });

    it("测试代币转账是否触发钩子合约", async () => {
        const amount = 2000000;
        let txResponse = await erc777Contract.connect(owner).transfer(sender.address, amount);
        await txResponse.wait();
        expect(await erc777Contract.balanceOf(sender.address)).to.equal(amount);

        // 由sender转账给receiver
        const userData = "0x1234";
        const amount2 = 500000;
        txResponse = await erc777Contract.connect(sender).send(receiver.address, amount2, userData);
        await txResponse.wait();
        expect(await erc777Contract.balanceOf(sender.address)).to.eq(amount - amount2);
        expect(await erc777Contract.balanceOf(receiver.address)).to.eq(amount2);

        // // 测试发送者钩子合约里的状态
        expect(await tokensSender.from(receiver.address)).to.eq(sender.address);
        expect(await tokensSender.to(receiver.address)).to.eq(receiver.address);
        expect(await tokensSender.data(receiver.address)).to.eq(userData);

        // // 测试接受者钩子合约里的状态
        expect(await tokensRecipient.from(sender.address)).to.eq(sender.address);
        expect(await tokensRecipient.to(sender.address)).to.eq(receiver.address);
        expect(await tokensRecipient.data(sender.address)).to.eq(userData);

        expect(await tokensRecipient.data(owner.address)).to.eq("0x");

    });

    it("测试操作员执行各种方法", async () => {
        const amount = 100000;
        const operatorData = "0x0011223344";
        await expect(erc777Contract.connect(operator).operatorSend(sender.address, receiver.address, amount, [], operatorData));
        await expect(erc777Contract.connect(operator2).operatorSend(sender.address, receiver.address, amount, [], operatorData)).to.be.reverted;

        await expect(erc777Contract.connect(sender).revokeOperator(operator.address))
            .to.emit(erc777Contract, "RevokedOperator")
            .withArgs(operator.address, sender.address);

        await expect(erc777Contract.connect(sender).authorizeOperator(operator2.address))
            .to.emit(erc777Contract, "AuthorizedOperator")
            .withArgs(operator2.address, sender.address);

        await expect(erc777Contract.connect(operator).operatorBurn(sender.address, amount, [], operatorData)).to.be.reverted;
        await expect(erc777Contract.connect(operator2).operatorBurn(sender.address, amount, [], operatorData)).not.to.be.reverted;
        expect(await tokensSender.operatorData(ethers.constants.AddressZero)).to.eq(operatorData);
    });

    it("测试钩子合约的拒绝交易", async () => {
        const amount = 100000;
        await expect(tokensSender.connect(sender).rejectTokensToSend()).not.to.be.reverted;
        await expect(erc777Contract.connect(sender).send(receiver.address, amount, "")).to.be.reverted;
        await expect(tokensSender.connect(sender).acceptTokensToSend()).not.to.be.reverted;

        await expect(tokensRecipient.connect(receiver).rejectTokens()).not.to.be.reverted;
        await expect(erc777Contract.connect(sender).send(receiver.address, amount, "")).to.be.reverted;
        await expect(tokensRecipient.connect(receiver).acceptTokens()).not.to.be.reverted;

        await expect(erc777Contract.connect(sender).send(receiver.address, amount, "0x")).not.to.be.reverted;
    });
});
